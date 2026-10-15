from uuid import UUID

from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.topic import Topic
from app.models.quiz import Quiz
from app.models.question import Question
from app.models.quiz_focus_topic import QuizFocusTopic
from app.services.llm_service import generate_quiz


def create_quiz(document_id: UUID, user_id: UUID, question_count: int, difficulty: str, question_types: list[str], db: Session) -> dict:
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == user_id,
    ).first()

    if document is None:
        raise ValueError("Document not found")

    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index)
        .all()
    )

    if not chunks:
        raise ValueError("The document has no text chunks")

    topics = (
        db.query(Topic)
        .filter(Topic.document_id == document_id)
        .order_by(Topic.position)
        .all()
    )

    if not topics:
        raise ValueError("Extract topics before generating a quiz")

    document_text = "\n\n".join(chunk.content for chunk in chunks)

    generated = generate_quiz(
        document_text=document_text,
        question_count=question_count,
        difficulty=difficulty,
        question_types=question_types,
        topic_names=[topic.name for topic in topics],
    )

    topics_by_name = {
        topic.name.strip().casefold(): topic
        for topic in topics
    }

    try:
        quiz = Quiz(
            user_id=user_id,
            document_id=document_id,
            title=generated.title,
            difficulty=difficulty,
            requested_count=question_count,
            question_types=question_types,
        )
        db.add(quiz)
        db.flush()

        for topic in topics:
            db.add(
                QuizFocusTopic(
                    quiz_id=quiz.id,
                    topic_id=topic.id,
                )
            )

        for position, item in enumerate(generated.questions):
            topic = topics_by_name.get(item.topic.strip().casefold())

            if topic is None:
                raise ValueError(
                    f"Gemini returned an unknown topic: {item.topic}"
                )

            question = Question(
                quiz_id=quiz.id,
                topic_id=topic.id,
                position=position,
                type=item.type,
                difficulty=item.difficulty,
                prompt=item.prompt,
                options=item.options,
                correct_answer=item.correct_answer,
                keywords=item.keywords,
                explanation=item.explanation,
            )
            db.add(question)

        db.commit()
        db.refresh(quiz)

        
        return {
            "id": str(quiz.id),
            "document_id": str(quiz.document_id),
            "title": quiz.title,
            "difficulty": quiz.difficulty,
            "requested_count": quiz.requested_count,
            "question_types": quiz.question_types,
            "is_saved": quiz.is_saved,
            "created_at": quiz.created_at.isoformat(),
            "questions": [
                {
                    "id": str(question.id),
                    "position": question.position,
                    "topic_id": str(question.topic_id),
                    "type": question.type,
                    "difficulty": question.difficulty,
                    "prompt": question.prompt,
                    "options": question.options,
                }
                for question in (
                    db.query(Question)
                    .filter(Question.quiz_id == quiz.id)
                    .order_by(Question.position)
                    .all()
                )
            ],
        }

    except Exception:
        db.rollback()
        raise


def get_quiz(quiz_id: UUID, user_id: UUID, db: Session) -> dict:
    quiz = db.query(Quiz).filter(
        Quiz.id == quiz_id,
        Quiz.user_id == user_id,
    ).first()

    if quiz is None:
        raise ValueError("Quiz not found")

    questions = (
        db.query(Question)
        .filter(Question.quiz_id == quiz.id)
        .order_by(Question.position)
        .all()
    )

    return {
        "id": str(quiz.id),
        "document_id": str(quiz.document_id),
        "title": quiz.title,
        "difficulty": quiz.difficulty,
        "requested_count": quiz.requested_count,
        "question_types": quiz.question_types,
        "is_saved": quiz.is_saved,
        "created_at": quiz.created_at.isoformat(),
        "questions": [
            {
                "id": str(question.id),
                "position": question.position,
                "topic_id": str(question.topic_id),
                "type": question.type,
                "difficulty": question.difficulty,
                "prompt": question.prompt,
                "options": question.options,
            }
            for question in questions
        ],
    }


def set_quiz_saved(quiz_id: UUID, user_id: UUID, is_saved: bool, db: Session) -> dict:
    quiz = db.query(Quiz).filter(
        Quiz.id == quiz_id,
        Quiz.user_id == user_id,
    ).first()

    if quiz is None:
        raise ValueError("Quiz not found")

    quiz.is_saved = is_saved
    db.commit()
    db.refresh(quiz)

    return {
        "id": str(quiz.id),
        "title": quiz.title,
        "is_saved": quiz.is_saved,
    }

def get_saved_quizzes(user_id: UUID, db: Session) -> list[dict]:
    quizzes = (
        db.query(Quiz)
        .filter(
            Quiz.user_id == user_id,
            Quiz.is_saved.is_(True),
        )
        .order_by(Quiz.updated_at.desc())
        .all()
    )

    return [
        {
            "id": str(quiz.id),
            "document_id": str(quiz.document_id),
            "title": quiz.title,
            "difficulty": quiz.difficulty,
            "requested_count": quiz.requested_count,
            "question_types": quiz.question_types,
            "is_saved": quiz.is_saved,
            "created_at": quiz.created_at.isoformat(),
        }
        for quiz in quizzes
    ]


def delete_quiz(quiz_id: UUID, user_id: UUID, db: Session) -> dict:
    quiz = (
        db.query(Quiz)
        .filter(
            Quiz.id == quiz_id,
            Quiz.user_id == user_id,
        )
        .first()
    )

    if quiz is None:
        raise ValueError("Quiz not found")

    db.delete(quiz)
    db.commit()

    return {
        "id": str(quiz_id),
        "deleted": True,
    }

def update_quiz(
    quiz_id: UUID,
    user_id: UUID,
    updates: dict,
    db: Session,
) -> dict:
    quiz = (
        db.query(Quiz)
        .filter(
            Quiz.id == quiz_id,
            Quiz.user_id == user_id,
        )
        .first()
    )

    if quiz is None:
        raise ValueError("Quiz not found")

    if "title" in updates and updates["title"] is not None:
        quiz.title = updates["title"].strip()

        if not quiz.title:
            raise ValueError("Title cannot be empty")

    if "is_saved" in updates and updates["is_saved"] is not None:
        quiz.is_saved = updates["is_saved"]

    if "folder_id" in updates:
        if updates["folder_id"] is None:
            quiz.folder_id = None
        else:
            folder_id = UUID(updates["folder_id"])
            from app.models.folder import Folder

            folder = (
                db.query(Folder)
                .filter(
                    Folder.id == folder_id,
                    Folder.user_id == user_id,
                )
                .first()
            )

            if folder is None:
                raise ValueError("Folder not found")

            if not quiz.is_saved:
                raise ValueError("Only saved quizzes can be assigned to a folder")

            quiz.folder_id = folder_id

    elif "is_saved" in updates and updates["is_saved"] is False:
        quiz.folder_id = None

    db.commit()
    db.refresh(quiz)

    return {
        "id": str(quiz.id),
        "title": quiz.title,
        "is_saved": quiz.is_saved,
        "folder_id": str(quiz.folder_id) if quiz.folder_id else None,
    }
