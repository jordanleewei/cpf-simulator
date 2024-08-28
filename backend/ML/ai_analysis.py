import os
import json
from dotenv import load_dotenv
from langchain_community.chat_models import ChatOpenAI
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationalRetrievalChain

load_dotenv()

def analyse_improvements(data):
    # Define OpenAI model
    llm = ChatOpenAI(
        temperature=1,
        openai_api_key=os.getenv("OPENAI_KEY"),
        model_name="gpt-4"
    )
    
    memory = ConversationBufferMemory(memory_key="chat_history", return_messages=False)
    
    # This is just for context, not used for retrieval but you can include it
    retriever = None

    # Initialize the ConversationalRetrievalChain (if needed, for more complex scenarios)
    qa = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=retriever,
        memory=memory
    )
    
    # Extracting attributes from data
    question = data.get("question")
    ideal = data.get("ideal")
    ideal_system_name = data.get("ideal_system_name")
    ideal_system_url = data.get("ideal_system_url")
    last_attempt = data.get("last_attempt")
    previous_attempt = data.get("previous_attempt")

    # Constructing the message for the prompt
    improvement_message = f"""
    You are provided with two attempts by a user for answering a question. Each attempt is scored on accuracy, precision, and tone. 
    The ideal answer to the question is also provided. Analyze the user's improvement across these attempts.
    
    Question: {question}

    First Attempt:
    Answer: {previous_attempt['answer']}
    Accuracy Score: {previous_attempt['accuracy_score']}
    Precision Score: {previous_attempt['precision_score']}
    Tone Score: {previous_attempt['tone_score']}
    System Name: {previous_attempt['system_name']}
    System URL: {previous_attempt['system_url']}
    
    Second Attempt:
    Answer: {last_attempt['answer']}
    Accuracy Score: {last_attempt['accuracy_score']}
    Precision Score: {last_attempt['precision_score']}
    Tone Score: {last_attempt['tone_score']}
    System Name: {last_attempt['system_name']}
    System URL: {last_attempt['system_url']}
    
    Ideal Answer:
    {ideal}
    
    The ideal system name is {ideal_system_name}, and the ideal system URL is {ideal_system_url}.
    
    Please analyze the user's improvement in accuracy, precision, and tone, and provide detailed feedback about the improvements and areas that still need work.
    """
    
    # Run the OpenAI model with this prompt
    result = qa.run({"question": improvement_message})

    # Return the result from OpenAI as feedback
    return result


# Simulate the previous and last attempts, and other data
# last_attempt = {
#     "answer": "Paris is the capital of France.",
#     "accuracy_score": 90,
#     "precision_score": 85,
#     "tone_score": 88,
#     "system_name": "System A",
#     "system_url": "http://example.com/systemA"
# }

# previous_attempt = {
#     "answer": "I believe the capital of France is Paris.",
#     "accuracy_score": 85,
#     "precision_score": 78,
#     "tone_score": 85,
#     "system_name": "System A",
#     "system_url": "http://example.com/systemA"
# }

# question_details = "What is the capital of France?"
# ideal = "The capital of France is Paris."
# ideal_system_name = "System A"
# ideal_system_url = "http://example.com/systemA"

# # Call the function to analyze improvements using OpenAI
# feedback = analyse_improvements(
#     last_attempt, 
#     previous_attempt, 
#     question_details, 
#     ideal, 
#     ideal_system_name, 
#     ideal_system_url
# )

# print(feedback)
