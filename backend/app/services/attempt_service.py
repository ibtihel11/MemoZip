from datetime import datetime, timezone
from uuid import UUID
import re

from httpx import request
from sqlalchemy.orm import Session

from app.models.quiz import Quiz
from app.models.question import Question
from app.models.quiz_attempt import QuizAttempt
from app.models.attempt_answer import AttemptAnswer
from app.models.attempt_topic_score import AttemptTopicScore
from app.services.analysis_service import generate_attempt_analysis
from app.models.topic import Topic
from app.services.llm_service import evaluate_short_answer

def normalize_answer(answer: str) -> str:
    answer = answer.casefold().strip()
    answer = re.sub(r"[^\w\s]", "", answer)
    answer = re.sub(r"\s+", " ", answer)
    return answer

def submit_quiz_attempt(
    quiz_id: UUID,
    user_id: UUID,
    attempt_id: UUID,
    answers: list[dict],
    db: Session,
) -> dict:
    quiz = db.query(Quiz).filter(
        Quiz.id == quiz_id,
        Quiz.user_id == user_id,
    ).first()

    if quiz is None:
        raise ValueError("Quiz not found")

    questions = (
        db.query(Question)
        .filter(Question.quiz_id == quiz_id)
        .order_by(Question.position)
        .all()
    )

    if not questions:
        raise ValueError("This quiz has no questions")

    questions_by_id = {question.id: question for question in questions}
    answers_by_id = {}

    for item in answers:
        question_id = UUID(item["question_id"])

        if question_id not in questions_by_id:
            raise ValueError(
                "An answer references a question outside this quiz"
            )

        if question_id in answers_by_id:
            raise ValueError("Duplicate answers for the same question")

        answers_by_id[question_id] = item["answer"].strip()

    if set(answers_by_id) != set(questions_by_id):
        raise ValueError("Submit exactly one answer for every question")

    attempt = (
    db.query(QuizAttempt)
    .filter(
        QuizAttempt.id == attempt_id,
        QuizAttempt.quiz_id == quiz_id,
        QuizAttempt.user_id == user_id,
        QuizAttempt.completed_at.is_(None),
    )
    .first())
    if attempt is None:
        raise ValueError("Active quiz attempt not found")
    topic_results = {}
    results = []
    correct_count = 0

    try:
        db.flush()

        for question in questions:
            user_answer = answers_by_id[question.id]
            correct_answer = question.correct_answer
            
            if question.type == "multiple_choice":
                options = question.options or {}
                correct_option_text = options.get(correct_answer)

                normalized_user_answer = normalize_answer(user_answer)
                is_correct = (
                    normalized_user_answer == normalize_answer(correct_answer)
                    or (
                        correct_option_text is not None
                        and normalized_user_answer == normalize_answer(correct_option_text)
                    )
                )
                feedback = question.explanation

            elif question.type == "true_false":
                is_correct = user_answer.casefold() == correct_answer.casefold()
                feedback = question.explanation

            else:
                accepted_answers = {correct_answer.casefold()}

                if question.keywords:
                    accepted_answers.update(
                        keyword.casefold()
                        for keyword in question.keywords
                    )

                normalized_answer = normalize_answer(user_answer)
                normalized_accepted = {
                    normalize_answer(answer)
                    for answer in accepted_answers
                }

                if normalized_answer in normalized_accepted:
                    is_correct = True
                    feedback = question.explanation
                else:
                    evaluation = evaluate_short_answer(
                        question=question.prompt,
                        expected_answer=correct_answer,
                        student_answer=user_answer,
                        keywords=question.keywords,
                    )
                    is_correct = evaluation["is_correct"]
                    feedback = evaluation["feedback"]

            if is_correct:
                correct_count += 1

            db.add(
                AttemptAnswer(
                    attempt_id=attempt.id,
                    question_id=question.id,
                    answer_text=user_answer,
                    is_correct=is_correct,
                    grading_score=1.0 if is_correct else 0.0,
                    grading_feedback=feedback,
                )
            )

            topic_id = question.topic_id

            if topic_id not in topic_results:
                topic_results[topic_id] = {
                    "correct_count": 0,
                    "total_count": 0,
                }

            topic_results[topic_id]["total_count"] += 1

            if is_correct:
                topic_results[topic_id]["correct_count"] += 1

            results.append(
                {
                    "question_id": str(question.id),
                    "user_answer": user_answer,
                    "correct_answer": correct_answer,
                    "is_correct": is_correct,
                    "explanation": feedback,
                }
            )

        attempt.correct_count = correct_count
        attempt.score = round(correct_count / len(questions) * 100)
        attempt.completed_at = datetime.now(timezone.utc)

        if attempt.started_at:
            start_time = attempt.started_at
            if start_time.tzinfo is None:
                start_time = start_time.replace(tzinfo=timezone.utc)

            attempt.duration_seconds = max(
                0,
                int((attempt.completed_at - start_time).total_seconds()),
            )
        topic_results_by_name = {}

        for topic_id, stats in topic_results.items():
            topic = db.query(Topic).filter(Topic.id == topic_id).first()
            topic_results_by_name[topic.name] = stats

        attempt.analysis_text = generate_attempt_analysis(
            score=attempt.score,
            topic_results=topic_results_by_name,
        )
        
        for topic_id, stats in topic_results.items():
            total = stats["total_count"]
            correct = stats["correct_count"]

            db.add(
                AttemptTopicScore(
                    attempt_id=attempt.id,
                    topic_id=topic_id,
                    score=round(correct / total * 100),
                    correct_count=correct,
                    total_count=total,
                )
            )

        db.commit()
        db.refresh(attempt)

        return {
            "attempt_id": str(attempt.id),
            "quiz_id": str(quiz_id),
            "total_count": attempt.total_count,
            "correct_count": attempt.correct_count,
            "score": attempt.score,
            "results": results,
        }

    except Exception:
        db.rollback()
        raise


def get_quiz_attempt(attempt_id: UUID, user_id: UUID, db: Session) -> dict:
    from app.models.topic import Topic

    attempt = (
        db.query(QuizAttempt)
        .filter(
            QuizAttempt.id == attempt_id,
            QuizAttempt.user_id == user_id,
        )
        .first()
    )

    if attempt is None:
        raise ValueError("Quiz attempt not found")

    answers = (
        db.query(AttemptAnswer, Question)
        .join(Question, AttemptAnswer.question_id == Question.id)
        .filter(AttemptAnswer.attempt_id == attempt_id)
        .order_by(Question.position)
        .all()
    )

    topic_scores = (
        db.query(AttemptTopicScore, Topic)
        .join(Topic, AttemptTopicScore.topic_id == Topic.id)
        .filter(AttemptTopicScore.attempt_id == attempt_id)
        .order_by(AttemptTopicScore.score.asc())
        .all()
    )

    return {
        "attempt_id": str(attempt.id),
        "quiz_id": str(attempt.quiz_id),
        "score": attempt.score,
        "total_count": attempt.total_count,
        "correct_count": attempt.correct_count,
        "completed_at": attempt.completed_at,
        "duration_seconds": attempt.duration_seconds,
        "analysis_text": attempt.analysis_text,
        "results": [
            {
                "question_id": str(question.id),
                "prompt": question.prompt,
                "user_answer": answer.answer_text,
                "correct_answer": question.correct_answer,
                "is_correct": answer.is_correct,
                "explanation": answer.grading_feedback or question.explanation,
            }
            for answer, question in answers
        ],
        "topic_scores": [
            {
                "topic_id": str(topic.id),
                "topic_name": topic.name,
                "score": topic_score.score,
                "correct_count": topic_score.correct_count,
                "total_count": topic_score.total_count,
            }
            for topic_score, topic in topic_scores
        ],
    }


def get_quiz_attempt_history(quiz_id: UUID, user_id: UUID, db: Session) -> list[dict]:
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

    attempts = (
        db.query(QuizAttempt)
        .filter(
            QuizAttempt.quiz_id == quiz_id,
            QuizAttempt.user_id == user_id,
            QuizAttempt.completed_at.isnot(None),
        )
        .order_by(QuizAttempt.completed_at.desc())
        .all()
    )

    return [
        {
            "attempt_id": str(attempt.id),
            "score": attempt.score,
            "total_count": attempt.total_count,
            "correct_count": attempt.correct_count,
            "completed_at": attempt.completed_at,
            "duration_seconds": attempt.duration_seconds,
            "analysis_text": attempt.analysis_text,
        }
        for attempt in attempts
    ]


def start_quiz_attempt(
    quiz_id: UUID,
    user_id: UUID,
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

    question_count = (
        db.query(Question)
        .filter(Question.quiz_id == quiz_id)
        .count()
    )

    if question_count == 0:
        raise ValueError("This quiz has no questions")

    attempt = QuizAttempt(
        quiz_id=quiz_id,
        user_id=user_id,
        total_count=question_count,
    )

    try:
        db.add(attempt)
        db.commit()
        db.refresh(attempt)

        return {
            "attempt_id": str(attempt.id),
            "quiz_id": str(attempt.quiz_id),
            "started_at": attempt.started_at,
            "total_count": attempt.total_count,
        }
    except Exception:
        db.rollback()
        raise
