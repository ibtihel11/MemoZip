from pydantic import BaseModel, Field, model_validator

class SummaryConceptGenerated(BaseModel):
    title: str = Field(min_length=1)
    body: str = Field(min_length=1)

class SummaryGenerated(BaseModel):
    title: str = Field(min_length=1)
    overview: str = Field(min_length=1)
    key_points: list[str] = Field(min_length=1)
    concepts: list[SummaryConceptGenerated] = Field(min_length=1)

class SummarySaveRequest(BaseModel):
    is_saved: bool
    
    
class SummaryUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    is_saved: bool | None = None
    folder_id: str | None = None

    @model_validator(mode="after")
    def validate_update(self):
        if all(
            value is None
            for value in (self.title, self.is_saved, self.folder_id)
        ):
            raise ValueError("At least one field must be provided")
        return self
