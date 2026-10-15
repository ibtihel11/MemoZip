from sqlalchemy.dialects.postgresql import ENUM


difficulty_enum = ENUM(
    "easy",
    "medium",
    "hard",
    "mixed",
    name="difficulty",
    create_type=False
)

question_difficulty_enum = ENUM(
    "easy",
    "medium",
    "hard",
    name="question_difficulty",
    create_type=False
)

question_type_enum = ENUM(
    "multiple_choice",
    "true_false",
    "short_answer",
    name="question_type",
    create_type=False
)

document_status_enum = ENUM(
    "uploaded",
    "processing",
    "ready",
    "failed",
    name="document_status",
    create_type=False
)

message_role_enum = ENUM(
    "user",
    "assistant",
    name="message_role",
    create_type=False
)

job_kind_enum = ENUM(
    "document_processing",
    "quiz_generation",
    "summary_generation",
    name="job_kind",
    create_type=False
)

job_status_enum = ENUM(
    "queued",
    "running",
    "succeeded",
    "failed",
    name="job_status",
    create_type=False
)