from pydantic import BaseModel
from typing import Optional

# Base model for input (create/update attempt)
class AttemptBase(BaseModel):
    user_id: str
    question_id: str
    answer: str
    system_name: str
    system_url: str

# Model for creating an attempt (same as AttemptBase)
class AttemptCreate(AttemptBase):
    pass

# Model for responses, including additional fields returned from the database
class AttemptResponse(AttemptBase):
    attempt_id: str  # Attempt ID returned from the database
    date: str  # Date of the attempt
    accuracy_score: int
    precision_score: int
    tone_score: int
    accuracy_feedback: Optional[str] = None  # Optional fields for feedback
    precision_feedback: Optional[str] = None
    tone_feedback: Optional[str] = None
    feedback: Optional[str] = None