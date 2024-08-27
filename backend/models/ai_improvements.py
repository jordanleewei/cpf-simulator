from sqlalchemy import Column, ForeignKey, String, DateTime
from sqlalchemy.orm import Mapped, relationship
from config import Base
import uuid
import datetime

def generate_uuid():
    return str(uuid.uuid4())

def generate_date():
    current_date = datetime.datetime.now()
    return current_date.strftime('%Y-%m-%d %H:%M')

class AIImprovementsModel(Base):
    __tablename__ = "ai_improvements"
    ai_improvements_id: Mapped[str] = Column(String(255), primary_key=True, default=generate_uuid)

    # Foreign keys to link with question and attempts
    question_id: Mapped[str] = Column(String(255), ForeignKey("question.question_id"), nullable=False)
    last_attempt_id: Mapped[str] = Column(String(255), ForeignKey("attempt.attempt_id"), nullable=False)
    previous_attempt_id: Mapped[str] = Column(String(255), ForeignKey("attempt.attempt_id"), nullable=True)

    # Date field using generate_date
    created: Mapped[str] = Column(String(255), default=generate_date, nullable=False)

    # Improvement Scores
    accuracy_improvement: Mapped[str] = Column(String(1000), nullable=False)
    precision_improvement: Mapped[str] = Column(String(1000), nullable=False)
    tone_improvement: Mapped[str] = Column(String(1000), nullable=False)
    improvement_feedback: Mapped[str] = Column(String(3000), nullable=False)

    # Relationships to fetch data from related models
    question: Mapped["QuestionModel"] = relationship("QuestionModel", back_populates="ai_improvements")
    last_attempt: Mapped["AttemptModel"] = relationship("AttemptModel", foreign_keys=[last_attempt_id])
    previous_attempt: Mapped["AttemptModel"] = relationship("AttemptModel", foreign_keys=[previous_attempt_id])

    def to_dict(self):
        return {
            "ai_improvements_id": self.ai_improvements_id,
            "question_id": self.question_id,
            "last_attempt_id": self.last_attempt_id,
            "previous_attempt_id": self.previous_attempt_id,
            "created": self.created,
            "accuracy_improvement": self.accuracy_improvement,
            "precision_improvement": self.precision_improvement,
            "tone_improvement": self.tone_improvement,
            "improvement_feedback": self.improvement_feedback,
            "question_details": self.question.question_details,
            "ideal": self.question.ideal,
            "ideal_system_name": self.question.ideal_system_name,
            "ideal_system_url": self.question.ideal_system_url,
            "last_attempt": self.last_attempt.to_dict(),
            "previous_attempt": self.previous_attempt.to_dict() if self.previous_attempt else None
        }
