from langchain_huggingface import HuggingFaceEmbeddings  # Updated import
from langchain_chroma import Chroma  # Updated import
from langchain_core.prompts import PromptTemplate 
from langchain_community.document_loaders.csv_loader import CSVLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.chat_models import ChatOpenAI
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationalRetrievalChain
import json
import os
from dotenv import load_dotenv
from fuzzywuzzy import fuzz

load_dotenv()

file_path = "./ML/faq_data_11Jul.csv"
vectorstore_path = "./ML/vectorstore"  # Define where to save the vectorstore

# Load the CSV file
loader = CSVLoader(file_path=file_path, encoding='utf-8')
data = loader.load()

# Split the documents
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
docs = text_splitter.split_documents(data)

# Load the embeddings
modelPath = "sentence-transformers/all-MiniLM-l6-v2"
model_kwargs = {'device': 'cpu'}
encode_kwargs = {'normalize_embeddings': False}

embeddings = HuggingFaceEmbeddings(
    model_name=modelPath,
    model_kwargs=model_kwargs,
    encode_kwargs=encode_kwargs
)

# Check if the vectorstore already exists, otherwise create and save it
if os.path.exists(vectorstore_path):
    vectorstore = Chroma(persist_directory=vectorstore_path, embedding_function=embeddings)
else:
    vectorstore = Chroma.from_documents(documents=docs, embedding=embeddings, persist_directory=vectorstore_path)
    vectorstore.persist()

retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

def process_response(res):
    try:
        try:
            json_object = json.loads(res)
            format_dict = {
                'accuracy_score': json_object.get('Accuracy'),
                'precision_score': json_object.get('Precision'),
                'tone_score': json_object.get('Tone'),
                'accuracy_feedback': json_object.get('Accuracy Feedback'),
                'precision_feedback': json_object.get('Precision Feedback'),
                'tone_feedback': json_object.get('Tone Feedback'),
                'feedback': json_object.get('Feedback')
            }
        except:
            json_object = json.loads('{' + res + '}')
            format_dict = {
                'accuracy_score': json_object.get('Accuracy'),
                'precision_score': json_object.get('Precision'),
                'tone_score': json_object.get('Tone'),
                'accuracy_feedback': json_object.get('Accuracy Feedback'),
                'precision_feedback': json_object.get('Precision Feedback'),
                'tone_feedback': json_object.get('Tone Feedback'),
                'feedback': json_object.get('Feedback')
            }
    except:
        format_dict = {
            'accuracy_score': 0,
            'precision_score': 0,
            'tone_score': 0,
            'accuracy_feedback': "No feedback",
            'precision_feedback': "No feedback",
            'tone_feedback': "No feedback",
            'feedback': "No feedback"
        }

    return format_dict

def openAI_response(question, response, ideal, ideal_system_name, ideal_system_url, system_name, system_url):

    # Define model
    llm = ChatOpenAI(
        temperature=1,
        openai_api_key=os.getenv("OPENAI_KEY"),
        model_name="gpt-4o-mini"
    )

    memory = ConversationBufferMemory(memory_key="chat_history", return_messages=False)

    qa = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=retriever,
        memory=memory
    )

    # Check similarity
    def are_source_names_correct(trainee_names, ideal_names):
        similarity_threshold = 70
        missing_names = []

        for ideal_name_original in ideal_names:
            ideal_name = ideal_name_original.lower()
            found_match = False
            for trainee_name_original in trainee_names:
                trainee_name = trainee_name_original.lower()
                similarity_score = fuzz.token_sort_ratio(trainee_name, ideal_name)
                if similarity_score >= similarity_threshold:
                    found_match = True
                    break

            if not found_match:
                missing_names.append(ideal_name_original)

        if missing_names:
            print(f"Missing ideal names: {missing_names}")
            return False, missing_names
        else:
            print("All trainee source names are correct.")
            return True, []

    # Check if source names are correct
    trainee_names = system_name.split(", ")
    ideal_names = ideal_system_name.split(", ")
    is_correct, missing_names = are_source_names_correct(trainee_names, ideal_names)

    # Determine feedback based on correctness
    if is_correct:
        feedback = "The source(s) referenced by the trainee are complete."
    else:
        feedback = f"The source(s) referenced by the trainee are incomplete. The missing source name(s) are {', '.join(missing_names)}."
    print(feedback)

    # Prompt template and further processing
    prompt_template = PromptTemplate.from_template(
        """
        I will give you a question, a customer service trainee's response to that question, and the ideal response to that question. 
        Please assess the trainee's response to the question. Do not actually answer the question, but evaluate the answer only using the context given and the ideal answer.
        Please give the trainee's response a score out of 5 for accuracy, precision and tone. Accuracy refers to if the factually correct answers were provided, precision refers to whether the answer has enough details and is concise, and tone refers to whether the tone of the answer is respectful and professional. 
        Please take note that the ideal response scored 5 for accuracy, precision and tone and use it as a point of reference.
        Please also give some general feedback for improvement.
        Please incorporate the following text in your Accuracy Feedback: {feedback}

        It is acceptable to give the trainee full marks if they answered similarly to the ideal response, and if you do not have improvements to give, please give a score of 5. Do not mention the existence of the ideal response when providing your feedback.
        
        Please give your response in this JSON format, where score is an integer and all feedbacks are a string: 
        "Accuracy": score, "Precision": score, "Tone": score, "Accuracy Feedback": accuracy_feedback, "Precision Feedback": precision_feedback, "Tone Feedback": tone_feedback, "Feedback": feedback_response
        Do not include backticks and do wrap the feedback in quotation marks.
        
        Question: {question}
        Trainee's response: {response}
        Ideal response: {ideal}
        Accuracy Feedback: {feedback} 
        
        """
    )

    result = qa.run({"question": prompt_template.format(
        question=question, response=response, ideal=ideal,
        ideal_system_name=ideal_system_name, ideal_system_url=ideal_system_url,
        system_name=system_name, system_url=system_url, feedback=feedback
    )})

    return result

