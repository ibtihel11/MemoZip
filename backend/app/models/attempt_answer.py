import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Text, REAL, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AttemptAnswer(Base):
    __tablename__ = "attempt_answers"

    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id"),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid()
    )
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("quiz_attempts.id", ondelete="CASCADE"),
        nullable=False
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False
    )
    answer_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        server_default=""
    )
    is_correct: Mapped[bool | None] = mapped_column(Boolean)
    grading_score: Mapped[float | None] = mapped_column(REAL)
    grading_feedback: Mapped[str | None] = mapped_column(Text)
    answered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )