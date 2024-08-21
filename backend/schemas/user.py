from pydantic import BaseModel
from typing import List, Optional

class UserBase(BaseModel):
    email: str
    password: Optional[str] = None
    access_rights: str
    name: str

class UserInput(BaseModel):
    email: str
    password: str

class UserResponseSchema(BaseModel):
    uuid: str
    email: str
    name: str
    access_rights: str
    schemes: List[str]
    class Config:
        from_attributes = True


