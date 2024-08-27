from sqlalchemy import Integer, Column, ForeignKey, String, DateTime, String
from sqlalchemy.orm import relationship, Mapped
from config import Base
import uuid
import datetime

def generate_uuid():
    return str(uuid.uuid4())

def generate_date():
    current_date = datetime.datetime.now()
    return current_date.strftime('%Y-%m-%d %H:%M')


class AttemptModel(Base):
    __tablename__ = "attempt"
    attempt_id: Mapped[str] = Column(String(255), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = Column(String(255), ForeignKey("user.uuid"), nullable=False)
    question_id: Mapped[str] = Column(String(255), ForeignKey("question.question_id"), nullable=False)
    answer: Mapped[str] = Column(String(3000), nullable=False)
    date: Mapped[str] = Column(String(255), default=generate_date, nullable=False)
    system_name: Mapped[str] = Column(String(3000), nullable=False)
    system_url: Mapped[str] = Column(String(3000), nullable=False)
    # scores
    precision_score: Mapped[int] = Column(Integer, nullable=False)
    accuracy_score: Mapped[int] = Column(Integer, nullable=False)
    tone_score: Mapped[int] = Column(Integer, nullable=False)
    accuracy_feedback: Mapped[str] = Column(String(1000), nullable=False)
    precision_feedback: Mapped[int] = Column(String(1000), nullable=False)
    tone_feedback: Mapped[str] = Column(String(1000), nullable=False)
    feedback: Mapped[str] = Column(String(3000), nullable=False)
    
     # Foreign key to AIImprovementsModel
    ai_improvement_id: Mapped[str] = Column(String(255), ForeignKey("ai_improvements.ai_improvements_id"), nullable=False)
    
    # Relationship back to AIImprovementsModel
    ai_improvement: Mapped["AIImprovementsModel"] = relationship("AIImprovementsModel", back_populates="attempts")

    def to_dict(self):
        return {
            "attempt_id": self.attempt_id,
            "user_id": self.user_id,
            "question_id": self.question_id,
            'answer': self.answer,
            'date': self.date,
            'precision_score': self.precision_score,
            'accuracy_score': self.accuracy_score,
            'tone_score': self.tone_score,
            'accuracy_feedback': self.accuracy_feedback,
            'precision_feedback': self.precision_feedback,
            'tone_feedback': self.tone_feedback,
            'feedback': self.feedback,
            'system_name': self.system_name,
            'system_url': self.system_url
        }