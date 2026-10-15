from typing import Literal

from pydantic import BaseModel, Field, model_validator

QuestionType = Literal["multiple_choice", "true_false", "short_answer"]
QuestionDifficulty = Literal["easy", "medium", "hard"]

class GeneratedQuestion(BaseModel):
    topic: str = Field(min_length=1)
    type: QuestionType
    difficulty: QuestionDifficulty
    prompt: str = Field(min_length=1)
    options: dict[str, str] | None = None
    correct_answer: str = Field(min_length=1)
    keywords: list[str] | None = None
    explanation: str = Field(min_length=1)

    @model_validator(mode="after")
    def validate_question_format(self):
        if self.type == "multiple_choice":
            if not self.options or len(self.options) < 2:
                raise ValueError(
                    "Multiple-choice questions need at least two options"
                )
            if self.correct_answer not in self.options:
                raise ValueError(
                    "The correct answer must match an option key"
                )

        elif self.type == "true_false":
            if self.options is not None:
                raise ValueError(
                    "True/false questions must not contain options"
                )
            if self.correct_answer.casefold() not in {"true", "false"}:
                raise ValueError(
                    "The correct answer must be true or false"
                )

        elif self.type == "short_answer":
            if self.options is not None:
                raise ValueError(
                    "Short-answer questions must not contain options"
                )

        return self

class GeneratedQuiz(BaseModel):
    title: str = Field(min_length=1)
    questions: list[GeneratedQuestion] = Field(min_length=1)

class QuizGenerationRequest(BaseModel):
    question_count: int = Field(default=15, ge=1, le=50)
    difficulty: Literal["easy", "medium", "hard", "mixed"] = "mixed"
    question_types: list[
        Literal["multiple_choice", "true_false", "short_answer"]
    ] = Field(
        default_factory=lambda: [
            "multiple_choice",
            "true_false",
            "short_answer",
        ],
        min_length=1,
    )

class QuizSaveRequest(BaseModel):
    is_saved: bool

class AnswerSubmission(BaseModel):
    question_id: str
    answer: str = Field(min_length=1)

class QuizAttemptSubmission(BaseModel):
    attempt_id: str
    answers: list[AnswerSubmission] = Field(min_length=1)

class QuestionResult(BaseModel):
    question_id: str
    user_answer: str
    correct_answer: str
    is_correct: bool
    explanation: str

class QuizAttemptResult(BaseModel):
    attempt_id: str
    quiz_id: str
    total_count: int
    correct_count: int
    score: float
    results: list[QuestionResult]

class QuizUpdateRequest(BaseModel):
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
