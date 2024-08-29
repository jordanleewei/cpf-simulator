import os
from dotenv import load_dotenv
from langchain_community.chat_models import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

load_dotenv()

def analyse_improvements(data):
    # Define OpenAI model
    llm = ChatOpenAI(
        temperature=1,
        openai_api_key=os.getenv("OPENAI_KEY"),
        model_name="gpt-4o-mini"
    )
    
    # Define the prompt template
    prompt_template = """
    You are provided with two attempts by a user for answering a question. Each attempt is scored on accuracy, precision, and tone. 
    The ideal answer to the question is also provided. Analyze the user's improvement across these attempts.

    Question: {question}

    First Attempt:
    Answer: {previous_answer}
    Accuracy Score: {previous_accuracy_score}
    Precision Score: {previous_precision_score}
    Tone Score: {previous_tone_score}
    System Name: {previous_system_name}
    System URL: {previous_system_url}
    
    Second Attempt:
    Answer: {last_answer}
    Accuracy Score: {last_accuracy_score}
    Precision Score: {last_precision_score}
    Tone Score: {last_tone_score}
    System Name: {last_system_name}
    System URL: {last_system_url}
    
    Ideal Answer:
    {ideal}
    
    The ideal system name is {ideal_system_name}, and the ideal system URL is {ideal_system_url}.
    
    Please analyze the user's improvement in accuracy, precision, and tone, and provide detailed feedback about the improvements and areas that still need work.
    """

    # Create the PromptTemplate object
    prompt = PromptTemplate(
        input_variables=[
            "question", "previous_answer", "previous_accuracy_score", "previous_precision_score", "previous_tone_score", 
            "previous_system_name", "previous_system_url", "last_answer", "last_accuracy_score", 
            "last_precision_score", "last_tone_score", "last_system_name", "last_system_url", "ideal", 
            "ideal_system_name", "ideal_system_url"
        ],
        template=prompt_template
    )

    # Initialize the LLMChain with the prompt template and LLM
    qa = LLMChain(
        llm=llm,
        prompt=prompt
    )
    
    # Extracting attributes from data
    improvement_message = {
        "question": data.get("question"),
        "previous_answer": data.get("previous_attempt")['answer'],
        "previous_accuracy_score": data.get("previous_attempt")['accuracy_score'],
        "previous_precision_score": data.get("previous_attempt")['precision_score'],
        "previous_tone_score": data.get("previous_attempt")['tone_score'],
        "previous_system_name": data.get("previous_attempt")['system_name'],
        "previous_system_url": data.get("previous_attempt")['system_url'],
        "last_answer": data.get("last_attempt")['answer'],
        "last_accuracy_score": data.get("last_attempt")['accuracy_score'],
        "last_precision_score": data.get("last_attempt")['precision_score'],
        "last_tone_score": data.get("last_attempt")['tone_score'],
        "last_system_name": data.get("last_attempt")['system_name'],
        "last_system_url": data.get("last_attempt")['system_url'],
        "ideal": data.get("ideal"),
        "ideal_system_name": data.get("ideal_system_name"),
        "ideal_system_url": data.get("ideal_system_url"),
    }
    
    # Run the OpenAI model with the constructed input
    result = qa.run(improvement_message)

    # Check if the result is too long and was cut off
    if result.endswith("..."):
        # If the output is cut off, you may need to continue the conversation with the model
        continuation_prompt = "Please continue where you left off."
        continuation_result = qa.run(continuation_prompt)
        result += continuation_result

    # Return the result from OpenAI as feedback
    return result
