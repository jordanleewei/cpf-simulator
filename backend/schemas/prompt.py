# schemas/prompt.py
from pydantic import BaseModel

class PromptBase(BaseModel):
    prompt_text: str
