import uuid

from sqlalchemy import ForeignKey, SmallInteger
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AttemptTopicScore(Base):
    __tablename__ = "attempt_topic_scores"

    attempt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("quiz_attempts.id", ondelete="CASCADE"),
        primary_key=True
    )
    topic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("topics.id", ondelete="CASCADE"),
        primary_key=True
    )
    score: Mapped[int] = mapped_column(
        SmallInteger,
        nullable=False
    )
    correct_count: Mapped[int] = mapped_column(
        SmallInteger,
        nullable=False
    )
    total_count: Mapped[int] = mapped_column(
        SmallInteger,
        nullable=False
    )