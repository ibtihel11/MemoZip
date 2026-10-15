from pydantic import BaseModel, Field, field_validator

class FolderCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Folder name cannot be empty")
        return value

class FolderUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Folder name cannot be empty")
        return value