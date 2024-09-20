from sqlalchemy import Column, String, Text
from sqlalchemy.orm import Mapped
from config import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class PromptModel(Base):
    __tablename__ = "prompt"
    prompt_id: Mapped[str] = Column(String(255), primary_key=True, default=generate_uuid)
    prompt_text: Mapped[str] = Column(Text, nullable=False)

    def to_dict(self):
        return {
            "prompt_id": self.prompt_id,
            "prompt_text": self.prompt_text,
        }
