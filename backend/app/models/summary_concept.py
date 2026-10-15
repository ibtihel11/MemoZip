import uuid

from sqlalchemy import ForeignKey, SmallInteger, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SummaryConcept(Base):
    __tablename__ = "summary_concepts"
    __table_args__ = (
    UniqueConstraint("summary_id", "position"),
)
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid()
    )
    summary_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("summaries.id", ondelete="CASCADE"),
        nullable=False
    )
    position: Mapped[int] = mapped_column(
        SmallInteger,
        nullable=False
    )
    title: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    body: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )