from pydantic import BaseModel

class ComparePromptRequest(BaseModel):
    prompt_text: str  