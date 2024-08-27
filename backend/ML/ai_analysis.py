def analyse_improvements(data):
    # Example analysis logic using all the attributes
    accuracy_improvement = data.get("accuracy_improvement")
    precision_improvement = data.get("precision_improvement")
    tone_improvement = data.get("tone_improvement")
    question_details = data.get("question_details")
    ideal = data.get("ideal")
    ideal_system_name = data.get("ideal_system_name")
    ideal_system_url = data.get("ideal_system_url")
    last_attempt = data.get("last_attempt")
    previous_attempt = data.get("previous_attempt")

    # Perform analysis (this is just an example, you can customize it)
    if accuracy_improvement > 0 and precision_improvement > 0 and tone_improvement > 0:
        feedback = f"Great job! Your accuracy, precision, and tone have all improved since the last attempt."
    else:
        feedback = f"Focus on improving your accuracy and precision for better performance."

    # More complex analysis could go here using the other attributes
    return feedback