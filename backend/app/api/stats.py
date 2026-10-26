from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.attempt_topic_score import AttemptTopicScore
from app.models.document import Document
from app.models.quiz import Quiz
from app.models.quiz_attempt import QuizAttempt
from app.models.topic import Topic
from app.models.user import User

router = APIRouter(prefix="/api/stats", tags=["Statistics"])


@router.get("")
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    completed_attempts = (
        db.query(QuizAttempt)
        .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
        .filter(
            QuizAttempt.user_id == current_user.id,
            Quiz.user_id == current_user.id,
            QuizAttempt.completed_at.is_not(None),
        )
    )

    completed_count = completed_attempts.count()

    average_score = (
        completed_attempts
        .with_entities(func.avg(QuizAttempt.score))
        .scalar()
    )

    latest_topic_attempts = (
        db.query(
            AttemptTopicScore.topic_id.label("topic_id"),
            func.max(QuizAttempt.completed_at).label("latest_completed_at"),
        )
        .join(
            QuizAttempt,
            QuizAttempt.id == AttemptTopicScore.attempt_id,
        )
        .join(
            Quiz,
            Quiz.id == QuizAttempt.quiz_id,
        )
        .join(
            Topic,
            Topic.id == AttemptTopicScore.topic_id,
        )
        .join(
            Document,
            Document.id == Topic.document_id,
        )
        .filter(
            QuizAttempt.user_id == current_user.id,
            Quiz.user_id == current_user.id,
            QuizAttempt.completed_at.is_not(None),
            Document.user_id == current_user.id,
        )
        .group_by(AttemptTopicScore.topic_id)
        .subquery()
    )

    latest_topic_scores = (
        db.query(
            AttemptTopicScore.topic_id,
            AttemptTopicScore.score,
            QuizAttempt.id.label("attempt_id"),
        )
        .join(
            QuizAttempt,
            QuizAttempt.id == AttemptTopicScore.attempt_id,
        )
        .join(
            Quiz,
            Quiz.id == QuizAttempt.quiz_id,
        )
        .join(
            latest_topic_attempts,
            (latest_topic_attempts.c.topic_id == AttemptTopicScore.topic_id)
            & (
                latest_topic_attempts.c.latest_completed_at
                == QuizAttempt.completed_at
            ),
        )
        .join(
            Topic,
            Topic.id == AttemptTopicScore.topic_id,
        )
        .join(
            Document,
            Document.id == Topic.document_id,
        )
        .filter(
            QuizAttempt.user_id == current_user.id,
            Quiz.user_id == current_user.id,
            QuizAttempt.completed_at.is_not(None),
            Document.user_id == current_user.id,
        )
        .subquery()
    )

    mastered_topics = (
        db.query(func.count(func.distinct(latest_topic_scores.c.topic_id)))
        .filter(latest_topic_scores.c.score >= 80)
        .scalar()
    )

    return {
        "completed_quizzes": completed_count,
        "average_score": round(float(average_score), 2)
        if average_score is not None else None,
        "topics_mastered": mastered_topics or 0,
    }
