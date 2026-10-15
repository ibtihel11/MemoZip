from uuid import UUID

from pydantic import BaseModel

class FolderAssignmentRequest(BaseModel):
    folder_id: UUID | None