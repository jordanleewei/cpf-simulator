from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.orm import Mapped
from config import Base
from datetime import datetime
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class PromptModel(Base):
    __tablename__ = "prompt"
    prompt_id: Mapped[str] = Column(String(255), primary_key=True, default=generate_uuid)
    prompt_text: Mapped[str] = Column(Text, nullable=False)
    updated_by: Mapped[str] = Column(String(255), nullable=True)  # Store the name or id of the user who last updated
    updated_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)  # Store the last updated time

    def to_dict(self):
        return {
            "prompt_id": self.prompt_id,
            "prompt_text": self.prompt_text,
            "updated_by": self.updated_by,  
            "updated_at": self.updated_at,  
        }
