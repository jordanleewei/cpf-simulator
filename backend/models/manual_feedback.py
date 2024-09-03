from sqlalchemy import Integer, Column, ForeignKey, String, DateTime
from sqlalchemy.orm import Mapped, relationship
from config import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class ManualFeedbackModel(Base):
    __tablename__ = "manual_feedback"
    manual_feedback_id: Mapped[str] = Column(String(255), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = Column(String(255), ForeignKey("user.uuid"), nullable=False)
    question_id: Mapped[str] = Column(String(255), ForeignKey("question.question_id"), nullable=False)
    attempt_id: Mapped[str] = Column(String(255), ForeignKey('attempt.attempt_id'), nullable=False)
    feedback: Mapped[str] = Column(String(3000), nullable=False)

    def to_dict(self):
        return {
            "manual_feedback_id": self.manual_feedback_id,
            "attempt_id": self.attempt_id,
            "user_id": self.user_id,
            "question_id": self.question_id,
            'feedback': self.feedback,
        }
