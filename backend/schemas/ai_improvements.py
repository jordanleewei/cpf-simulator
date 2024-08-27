from pydantic import BaseModel

class AIImprovementsBase(BaseModel):
    user_id: str
    question_id: str
    answer: str
    date: str
    system_name: str
    system_url: str
    precision_score: int
    accuracy_score: int
    tone_score: int
    accuracy_feedback: str
    precision_feedback: str
    tone_feedback: str
    feedback: str
    
    # Attributes from QuestionModel
    question_details: str
    ideal: str
    ideal_system_name: str
    ideal_system_url: str
    
    # New attribute for user improvement feedback
    improvement_feedback: str