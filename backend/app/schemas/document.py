from uuid import UUID

from pydantic import BaseModel, Field


class DocumentUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    folder_id: UUID | None = None