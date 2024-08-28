from pydantic import BaseModel

class AIImprovementsBase(BaseModel):
    user_id: str
    question_id: str
    precision_improvement: float  # Store the difference in precision
    accuracy_improvement: float  # Store the difference in accuracy
    tone_improvement: float  # Store the difference in tone
    improvement_feedback: str  # The overall AI-generated feedback for improvement