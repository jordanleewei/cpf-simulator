from sqlalchemy import Column, Text, Integer
from sqlalchemy.orm import Mapped
from config import Base

class SystemModel(Base):
    __tablename__ = "systems"

    id: Mapped[int] = Column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = Column(Text, nullable=False)
    url: Mapped[str] = Column(Text, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "url": self.url,
        }