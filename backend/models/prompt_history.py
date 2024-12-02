from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, relationship
from config import Base
from datetime import datetime
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class PromptHistoryModel(Base):
    __tablename__ = "prompt_history"
    history_id: Mapped[str] = Column(String(255), primary_key=True, default=generate_uuid)
    prompt_text: Mapped[str] = Column(Text, nullable=False)
    updated_by: Mapped[str] = Column(String(255), nullable=True)  # Store the name or id of the user who made the change
    updated_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow)  # Store the time of the change
    prompt_id: Mapped[str] = Column(String(255), ForeignKey("prompt.prompt_id"), nullable=False)

    def to_dict(self):
        return {
            "history_id": self.history_id,
            "prompt_text": self.prompt_text,
            "updated_by": self.updated_by,
            "updated_at": self.updated_at,
            "prompt_id": self.prompt_id,
        }
