import uuid
from datetime import datetime

from sqlalchemy import CHAR, DateTime, ForeignKey, Integer, BigInteger, SmallInteger, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import document_status_enum


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid()
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    folder_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("folders.id", ondelete="SET NULL")
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    file_name: Mapped[str] = mapped_column(Text, nullable=False)
    storage_key: Mapped[str] = mapped_column(Text, nullable=False)
    mime_type: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        server_default="application/pdf"
    )
    size_bytes: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False
    )
    sha256: Mapped[str | None] = mapped_column(CHAR(64))
    page_count: Mapped[int | None] = mapped_column(Integer)
    concept_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default="0"
    )
    status: Mapped[str] = mapped_column(
        document_status_enum,
        nullable=False,
        server_default="uploaded"
    )
    processing_step: Mapped[int] = mapped_column(
        SmallInteger,
        nullable=False,
        server_default="0"
    )
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )
    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )