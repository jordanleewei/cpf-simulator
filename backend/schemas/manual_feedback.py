from pydantic import BaseModel
from typing import Optional

# Base model for input
class ManualFeedbackBase(BaseModel):
    feedback: str