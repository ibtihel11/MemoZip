from pydantic import BaseModel, Field


class ExtractedTopic(BaseModel):
    name: str = Field(min_length=1)


class ExtractedTopics(BaseModel):
    topics: list[ExtractedTopic] = Field(min_length=1)