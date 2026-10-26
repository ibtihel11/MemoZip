import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class ConversationCreateRequest(BaseModel):
    title: str = Field(default="New chat", min_length=1, max_length=200)
    document_id: uuid.UUID | None = None

class ConversationUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)

class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    document_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

class MessageCreateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=10000)

class MessageSourceResponse(BaseModel):
    document_id: uuid.UUID
    chunk_id: uuid.UUID | None
    page_start: int
    page_end: int
    section: str | None
    relevance: float | None

class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    role: str
    content: str
    model: str | None
    created_at: datetime
    sources: list[MessageSourceResponse] = Field(default_factory=list)

class ConversationDetailResponse(ConversationResponse):
    messages: list[MessageResponse] = Field(default_factory=list)
