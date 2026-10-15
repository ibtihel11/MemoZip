import uuid
from datetime import datetime

from sqlalchemy import DateTime, SmallInteger, Text, func
from sqlalchemy.dialects.postgresql import CITEXT, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import difficulty_enum


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid()
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(CITEXT, nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    default_difficulty: Mapped[str] = mapped_column(
        difficulty_enum,
        nullable=False,
        server_default="mixed"
    )
    default_question_count: Mapped[int] = mapped_column(
        SmallInteger,
        nullable=False,
        server_default="15"
    )
    theme: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        server_default="tokyo-night"
    )
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