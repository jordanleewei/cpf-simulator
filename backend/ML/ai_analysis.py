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
        model_name="gpt-4o"
    )
    
    # Define the prompt template
    prompt_template = """
    You are provided with two attempts by a user for answering a question. Each attempt is scored on accuracy, precision, and tone. 
    The ideal response to the question is also provided. Analyze the user's improvement across these attempts. Do not mention the existence of the ideal response when providing your feedback.

    Question: {question}

    Previous Attempt:
    
    Answer: {previous_answer}
    Accuracy Score: {previous_accuracy_score}
    Precision Score: {previous_precision_score}
    Tone Score: {previous_tone_score}
    System Name: {previous_system_name}
    System URL: {previous_system_url}
    
    Latest Attempt:
    
    Answer: {last_answer}
    Accuracy Score: {last_accuracy_score}
    Precision Score: {last_precision_score}
    Tone Score: {last_tone_score}
    System Name: {last_system_name}
    System URL: {last_system_url}
    
    Ideal Answer:
    {ideal}
    
    The ideal system name is {ideal_system_name}, and the ideal system URL is {ideal_system_url}.
    
    Please analyze the user's improvement in accuracy, comprehension, and tone.

    Use the following rubric as a guide when evaluating the improvements:

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

    Based on this rubric and the ideal answer, evaluate the improvements, and provide a brief improvement feedback, no need to give any examples. Format the feedback as follows:
    **Accuracy**

    Previous Attempt Score: {previous_accuracy_score}
    Latest Attempt Score: {last_accuracy_score}
    [Accuracy feedback text here]

    ___
    
    **Comprehension**

    Previous Attempt Score: {previous_precision_score}
    Latest Attempt Score: {last_precision_score}
    [Comprehension feedback text here]

    ___

    **Tone**

    Previous Attempt Score: {previous_tone_score}
    Latest Attempt Score: {last_tone_score}
    [Tone feedback text here]

    ___

    **Improvement Feedback**: Provide a summary of the overall improvement or regression seen across the two attempts, along with actionable feedback for further improvement.
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
