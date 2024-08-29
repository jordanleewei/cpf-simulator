from sqlalchemy import Column, ForeignKey, String, DateTime
from sqlalchemy.orm import Mapped, relationship
from config import Base
from sqlalchemy.sql import func
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class QuestionModel(Base):
    __tablename__ = "question"
    question_id: Mapped[str] = Column(String(255), primary_key=True, default=generate_uuid)
    question_difficulty: Mapped[str] = Column(String(50), nullable=False)
    question_details: Mapped[str] = Column(String(3000), nullable=False)
    created: Mapped[DateTime] = Column(DateTime, default=func.now())
    ideal: Mapped[str] = Column(String(3000), nullable=False)
    title: Mapped[str] = Column(String(255), nullable=False)
    scheme_name: Mapped[str] = Column(String(255), ForeignKey("scheme.scheme_name"), nullable=False)
    scheme: Mapped["SchemeModel"] = relationship("SchemeModel", back_populates="questions")

    ideal_system_name: Mapped[str] = Column(String(255))
    ideal_system_url: Mapped[str] = Column(String(1000))
    
    def to_dict(self):
        return {
            'question_id': self.question_id,
            'question_difficulty': self.question_difficulty,
            'question_details': self.question_details,
            'ideal': self.ideal,
            'title': self.title,
            'scheme_name': self.scheme, # Don't change this line
            'ideal_system_name': self.ideal_system_name,
            'ideal_system_url': self.ideal_system_url
        }
