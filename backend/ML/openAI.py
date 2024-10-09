from langchain_huggingface import HuggingFaceEmbeddings  # Updated import
from langchain_community.vectorstores import Chroma # Updated import
from langchain_core.prompts import PromptTemplate 
from langchain_community.document_loaders.csv_loader import CSVLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.chat_models import ChatOpenAI
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationalRetrievalChain
from sqlalchemy.orm import Session
from session import SessionFactory
from models.prompt import PromptModel
import json
import os
from dotenv import load_dotenv
from fuzzywuzzy import fuzz

load_dotenv()

# Define paths
DEFAULT_FILE_PATH = "./ML/faq_data_9Oct.csv"
DYNAMIC_CSV_PATH = "./ML/dynamic_faq.csv"  # Path to dynamic CSV uploaded by user
VECTORSTORE_PATH = "./ML/vectorstore"  # Path to save the vectorstore

# Global retriever
retriever = None

def load_vectorstore(file_path, vectorstore_path):
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
    
    # Create and save the vectorstore
    vectorstore = Chroma.from_documents(documents=docs, embedding=embeddings, persist_directory=vectorstore_path)
    vectorstore.persist()
    return vectorstore

def initialize_vectorstore():
    global retriever
    # Load the embeddings
    modelPath = "sentence-transformers/all-MiniLM-l6-v2"
    model_kwargs = {'device': 'cpu'}
    encode_kwargs = {'normalize_embeddings': False}
    
    embeddings = HuggingFaceEmbeddings(
        model_name=modelPath,
        model_kwargs=model_kwargs,
        encode_kwargs=encode_kwargs
    )
    
    # Use the dynamic CSV if it exists, otherwise use the default
    if os.path.exists(DYNAMIC_CSV_PATH):
        file_path = DYNAMIC_CSV_PATH
    else:
        file_path = DEFAULT_FILE_PATH

    # Check if the vectorstore already exists, otherwise create and save it
    if os.path.exists(VECTORSTORE_PATH):
        vectorstore = Chroma(persist_directory=VECTORSTORE_PATH, embedding_function=embeddings)
    else:
        vectorstore = load_vectorstore(file_path, VECTORSTORE_PATH)
    
    retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

def update_vectorstore():
    global retriever
    # Load the embeddings
    modelPath = "sentence-transformers/all-MiniLM-l6-v2"
    model_kwargs = {'device': 'cpu'}
    encode_kwargs = {'normalize_embeddings': False}
    
    embeddings = HuggingFaceEmbeddings(
        model_name=modelPath,
        model_kwargs=model_kwargs,
        encode_kwargs=encode_kwargs
    )
    
    # Use the dynamic CSV if it exists, otherwise use the default
    if os.path.exists(DYNAMIC_CSV_PATH):
        file_path = DYNAMIC_CSV_PATH
    else:
        file_path = DEFAULT_FILE_PATH

    # Rebuild the vectorstore
    vectorstore = load_vectorstore(file_path, VECTORSTORE_PATH)
    # Re-initialize the retriever
    retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

# Initialize the retriever when the module is imported
initialize_vectorstore()

def process_response(res):
    try:
        try:
            json_object = json.loads(res)
            format_dict = {
                'accuracy_score': json_object.get('Accuracy'),
                'precision_score': json_object.get('Comprehension'),
                'tone_score': json_object.get('Tone'),
                'accuracy_feedback': json_object.get('Accuracy Feedback'),
                'precision_feedback': json_object.get('Comprehension Feedback'),
                'tone_feedback': json_object.get('Tone Feedback'),
                'feedback': json_object.get('Feedback')
            }
        except:
            json_object = json.loads('{' + res + '}')
            format_dict = {
                'accuracy_score': json_object.get('Accuracy'),
                'precision_score': json_object.get('Comprehension'),
                'tone_score': json_object.get('Tone'),
                'accuracy_feedback': json_object.get('Accuracy Feedback'),
                'precision_feedback': json_object.get('Comprehension Feedback'),
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
        temperature=0.3,
        openai_api_key=os.getenv("OPENAI_KEY"),
        model_name="gpt-4o"
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

   # Fetch the prompt from the database
    db = SessionFactory()
    try:
        db_prompt = db.query(PromptModel).first()
        if db_prompt and db_prompt.prompt_text.strip():
            prompt_text = db_prompt.prompt_text
        else:
            prompt_text = None  # Use default prompt if none is set or prompt is empty
    except Exception as e:
        db.rollback()
        print(f"Error fetching prompt from database: {e}")
        prompt_text = None  # Fallback to default prompt
    finally:
        db.close()  # Ensure the session is closed

    # Use the dynamic prompt if available; else use the default prompt
    if prompt_text:
        prompt_template = PromptTemplate.from_template(prompt_text)
    else:
        # Use the hardcoded default prompt
        prompt_template = PromptTemplate.from_template(
            """
            I will give you a question, a customer service trainee's response to that question, and the ideal response to that question.
            Please assess the trainee's response to the question. Do not actually answer the question, but evaluate the answer only using the context given and the ideal answer.
            Please give the trainee's response a score out of 5 for accuracy, comprehension, and tone. Accuracy refers to if the factually correct answers were provided, comprehension refers to whether the answer has enough details, is concise and demonstrates that the question was fully understood, and tone refers to whether the tone of the answer is respectful and professional.
            Please take note that the ideal response scored 5 for accuracy, comprehension, and tone and use it as a point of reference.
            Please also give some general feedback for improvement.
            Please incorporate the following text in your Accuracy Feedback: {feedback}

            If the trainee's response contains exact dates and monetary figures that are not in the question and do not match the ideal response, please ignore it when grading accuracy. For exact dates and monetary figures that are in the question, the trainee’s response should contain such information, even if they are not in the ideal response.

            It is acceptable to give the trainee full marks if they answered similarly to the ideal response after ignoring what should be ignored based on the earlier instructions for exact dates and figures. If you do not have improvements to give, please also give a score of 5. Do not mention the existence of the ideal response when providing your feedback.

            Use the following rubric as a guide when evaluating the response:

            **Accuracy**
            - **1**: The response contains significant errors and inaccuracies, possibly leading to misinformation or confusion for the customer.
            - **2**: The response has several inaccuracies and lacks attention to detail, which could impact the customer's understanding of the information provided.
            - **3**: The response is mostly accurate but may contain minor errors that do not significantly impact the overall understanding.
            - **4**: The response is accurate with very few, if any, errors, ensuring that the information provided is reliable and correct.
            - **5**: The response is completely accurate and error-free, demonstrating a high level of attention to detail and precision in the information provided.

            **Comprehension**
            - **1**: The response demonstrates a lack of understanding of the customer's query, possibly leading to irrelevant or unhelpful information being provided.
            - **2**: The response shows partial understanding of the customer's query, but may miss key points or fail to address the customer's needs comprehensively.
            - **3**: The response demonstrates a good understanding of the customer's query, addressing the main points effectively and providing relevant information.
            - **4**: The response shows a clear understanding of the customer's query, ensuring that all aspects of the customer's query are addressed accurately and comprehensively.
            - **5**: The response demonstrates an exceptional understanding of the customer's query, even in ambiguous situations, providing insightful and comprehensive information that exceeds the customer's expectations.

            **Tone**
            - **1**: The tone is inappropriate, unprofessional, or rude, potentially leading to a negative customer experience.
            - **2**: The tone is somewhat inappropriate or lacks professionalism, which may impact the customer's perception of the service.
            - **3**: The tone is polite and professional, but may have some inconsistencies or lack a personal touch, potentially affecting the overall customer experience.
            - **4**: The tone is consistently polite, professional, and engaging, enhancing the customer's experience and demonstrating a high level of customer service.
            - **5**: The tone is consistently polite, professional, and empathetic, creating a positive and supportive customer experience that exceeds expectations.

            Please give your response in this JSON format, where score is an integer and all feedbacks are a string:
            "Accuracy": score, "Comprehension": score, "Tone": score, "Accuracy Feedback": accuracy_feedback, "Comprehension Feedback": comprehension_feedback, "Tone Feedback": tone_feedback, "Feedback": feedback_response
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

def get_default_prompt():
    return """
    I will give you a question, a customer service trainee's response to that question, and the ideal response to that question.
    Please assess the trainee's response to the question. Do not actually answer the question, but evaluate the answer only using the context given and the ideal answer.
    Please give the trainee's response a score out of 5 for accuracy, comprehension, and tone. Accuracy refers to if the factually correct answers were provided, comprehension refers to whether the answer has enough details, is concise and demonstrates that the question was fully understood, and tone refers to whether the tone of the answer is respectful and professional.
    Please take note that the ideal response scored 5 for accuracy, comprehension, and tone and use it as a point of reference.
    Please also give some general feedback for improvement.
    Please incorporate the following text in your Accuracy Feedback: {feedback}

    If the trainee's response contains exact dates and monetary figures that are not in the question and do not match the ideal response, please ignore it when grading accuracy. For exact dates and monetary figures that are in the question, the trainee’s response should contain such information, even if they are not in the ideal response.

    It is acceptable to give the trainee full marks if they answered similarly to the ideal response after ignoring what should be ignored based on the earlier instructions for exact dates and figures. If you do not have improvements to give, please also give a score of 5. Do not mention the existence of the ideal response when providing your feedback.

    Use the following rubric as a guide when evaluating the response:

    **Accuracy**
    - **1**: The response contains significant errors and inaccuracies, possibly leading to misinformation or confusion for the customer.
    - **2**: The response has several inaccuracies and lacks attention to detail, which could impact the customer's understanding of the information provided.
    - **3**: The response is mostly accurate but may contain minor errors that do not significantly impact the overall understanding.
    - **4**: The response is accurate with very few, if any, errors, ensuring that the information provided is reliable and correct.
    - **5**: The response is completely accurate and error-free, demonstrating a high level of attention to detail and precision in the information provided.

    **Comprehension**
    - **1**: The response demonstrates a lack of understanding of the customer's query, possibly leading to irrelevant or unhelpful information being provided.
    - **2**: The response shows partial understanding of the customer's query, but may miss key points or fail to address the customer's needs comprehensively.
    - **3**: The response demonstrates a good understanding of the customer's query, addressing the main points effectively and providing relevant information.
    - **4**: The response shows a clear understanding of the customer's query, ensuring that all aspects of the customer's query are addressed accurately and comprehensively.
    - **5**: The response demonstrates an exceptional understanding of the customer's query, even in ambiguous situations, providing insightful and comprehensive information that exceeds the customer's expectations.

    **Tone**
    - **1**: The tone is inappropriate, unprofessional, or rude, potentially leading to a negative customer experience.
    - **2**: The tone is somewhat inappropriate or lacks professionalism, which may impact the customer's perception of the service.
    - **3**: The tone is polite and professional, but may have some inconsistencies or lack a personal touch, potentially affecting the overall customer experience.
    - **4**: The tone is consistently polite, professional, and engaging, enhancing the customer's experience and demonstrating a high level of customer service.
    - **5**: The tone is consistently polite, professional, and empathetic, creating a positive and supportive customer experience that exceeds expectations.

    Please give your response in this JSON format, where score is an integer and all feedbacks are a string:
    "Accuracy": score, "Comprehension": score, "Tone": score, "Accuracy Feedback": accuracy_feedback, "Comprehension Feedback": comprehension_feedback, "Tone Feedback": tone_feedback, "Feedback": feedback_response
    Do not include backticks and do wrap the feedback in quotation marks.

    Question: {question}
    Trainee's response: {response}
    Ideal response: {ideal}
    Accuracy Feedback: {feedback}
    """

