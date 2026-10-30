from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.document import Document
from app.models.folder import Folder
from app.models.quiz import Quiz
from app.models.summary import Summary
from app.models.user import User
from app.schemas.library import FolderAssignmentRequest
from app.services.summary_service import get_summary_by_id
from sqlalchemy import func

from app.models.quiz_attempt import QuizAttempt
from app.models.question import Question

router = APIRouter(prefix="/api/library", tags=["Library"])


def assign_folder(item, folder_id: UUID | None, user_id: UUID, db: Session):
    if folder_id is not None:
        folder = (
            db.query(Folder)
            .filter(
                Folder.id == folder_id,
                Folder.user_id == user_id,
            )
            .first()
        )

        if folder is None:
            raise HTTPException(
                status_code=404,
                detail="Folder not found",
            )

    item.folder_id = folder_id
    db.commit()
    db.refresh(item)

    return {
        "id": str(item.id),
        "title": item.title,
        "folder_id": str(item.folder_id) if item.folder_id else None,
        "updated_at": item.updated_at,
    }


@router.patch("/quizzes/{quiz_id}/folder")
def move_quiz_to_folder(
    quiz_id: UUID,
    request: FolderAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quiz = (
        db.query(Quiz)
        .filter(
            Quiz.id == quiz_id,
            Quiz.user_id == current_user.id,
        )
        .first()
    )

    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")

    return assign_folder(quiz, request.folder_id, current_user.id, db)


@router.patch("/summaries/{summary_id}/folder")
def move_summary_to_folder(
    summary_id: UUID,
    request: FolderAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    summary = (
        db.query(Summary)
        .filter(
            Summary.id == summary_id,
            Summary.user_id == current_user.id,
        )
        .first()
    )

    if summary is None:
        raise HTTPException(status_code=404, detail="Summary not found")

    return assign_folder(summary, request.folder_id, current_user.id, db)


@router.get("/folders/{folder_id}")
def get_folder_contents(
    folder_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    folder = (
        db.query(Folder)
        .filter(
            Folder.id == folder_id,
            Folder.user_id == current_user.id,
        )
        .first()
    )

    if folder is None:
        raise HTTPException(status_code=404, detail="Folder not found")

    quizzes = (
        db.query(Quiz)
        .filter(
            Quiz.folder_id == folder_id,
            Quiz.user_id == current_user.id,
            Quiz.is_saved.is_(True),
        )
        .all()
    )

    summaries = (
        db.query(Summary)
        .filter(
            Summary.folder_id == folder_id,
            Summary.user_id == current_user.id,
            Summary.is_saved.is_(True),
        )
        .all()
    )

    items = []

    for quiz in quizzes:
        items.append({
            "id": str(quiz.id),
            "type": "quiz",
            "title": quiz.title,
            "created_at": quiz.created_at,
        })

    for summary in summaries:
        items.append({
            "id": str(summary.id),
            "type": "summary",
            "title": summary.title,
            "created_at": summary.created_at,
        })

    items.sort(
        key=lambda item: item["created_at"],
        reverse=True,
    )

    return {
        "folder_id": str(folder.id),
        "folder_name": folder.name,
        "total_items": len(items),
        "items": items,
    }


@router.get("/items")
def get_library_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quizzes = (
        db.query(Quiz)
        .filter(
            Quiz.user_id == current_user.id,
            Quiz.is_saved.is_(True),
        )
        .all()
    )

    summaries = (
        db.query(Summary)
        .filter(
            Summary.user_id == current_user.id,
            Summary.is_saved.is_(True),
        )
        .all()
    )

    folder_ids = {
        item.folder_id
        for item in [*quizzes, *summaries]
        if item.folder_id is not None
    }

    folders = {}
    if folder_ids:
        folders = {
            folder.id: folder.name
            for folder in db.query(Folder)
            .filter(
                Folder.id.in_(folder_ids),
                Folder.user_id == current_user.id,
            )
            .all()
        }

    items = []

    for quiz in quizzes:
        items.append({
            "id": str(quiz.id),
            "type": "quiz",
            "title": quiz.title,
            "folder_id": str(quiz.folder_id) if quiz.folder_id else None,
            "folder_name": folders.get(quiz.folder_id),
            "created_at": quiz.created_at,
        })

    for summary in summaries:
        items.append({
            "id": str(summary.id),
            "type": "summary",
            "title": summary.title,
            "folder_id": str(summary.folder_id) if summary.folder_id else None,
            "folder_name": folders.get(summary.folder_id),
            "created_at": summary.created_at,
        })

    items.sort(
        key=lambda item: item["created_at"],
        reverse=True,
    )

    return {
        "total_items": len(items),
        "items": items,
    }


@router.get("/documents")
def get_library_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    documents = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
        .all()
    )

    items = [
        {
            "id": str(document.id),
            "type": "document",
            "title": document.title,
            "status": document.status,
            "created_at": document.created_at,
        }
        for document in documents
    ]

    return {
        "total_items": len(items),
        "items": items,
    }


@router.get("/summaries/{summary_id}")
def get_library_summary(
    summary_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_summary_by_id(
        summary_id=summary_id,
        user_id=current_user.id,
        db=db,
    )

@router.get("")
def get_library(item_type: str | None = Query(
        default=None,
        alias="type",
        pattern="^(document|quiz|summary)$",
    ), 
    folder_id: UUID | None = Query(default=None, alias="folderId"),
    document_id: UUID | None = Query(default=None, alias="documentId"),
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    search = q.strip() if q and q.strip() else None
    items = []

    documents_query = db.query(Document).filter(
        Document.user_id == current_user.id
    )

    if document_id is not None:
        documents_query = documents_query.filter(
            Document.id == document_id
        )

    if search:
        documents_query = documents_query.filter(
            Document.title.ilike(f"%{search}%")
        )

    if item_type in (None, "document") and folder_id is None:
        documents = documents_query.order_by(
            Document.created_at.desc()
        ).all()

        for document in documents:
            items.append({
                "id": str(document.id),
                "type": "document",
                "title": document.title,
                "status": document.status,
                "document_id": str(document.id),
                "created_at": document.created_at,
            })

    quizzes_query = db.query(Quiz).filter(
        Quiz.user_id == current_user.id,
        Quiz.is_saved.is_(True),
    )

    if folder_id is not None:
        quizzes_query = quizzes_query.filter(
            Quiz.folder_id == folder_id
        )

    if document_id is not None:
        quizzes_query = quizzes_query.filter(
            Quiz.document_id == document_id
        )

    if search:
        quizzes_query = quizzes_query.filter(
            Quiz.title.ilike(f"%{search}%")
        )

    if item_type in (None, "quiz"):
        quizzes = quizzes_query.all()
        quiz_ids = [quiz.id for quiz in quizzes]

        question_counts = {}
        last_scores = {}

        if quiz_ids:
            counts = (
                db.query(Question.quiz_id, func.count(Question.id))
                .filter(Question.quiz_id.in_(quiz_ids))
                .group_by(Question.quiz_id)
                .all()
            )
            question_counts = dict(counts)

            attempts = (
                db.query(QuizAttempt)
                .filter(
                    QuizAttempt.quiz_id.in_(quiz_ids),
                    QuizAttempt.user_id == current_user.id,
                    QuizAttempt.completed_at.is_not(None),
                )
                .order_by(QuizAttempt.completed_at.desc())
                .all()
            )

            for attempt in attempts:
                if attempt.quiz_id not in last_scores:
                    last_scores[attempt.quiz_id] = attempt.score

        for quiz in quizzes:
            document = db.get(Document, quiz.document_id)

            items.append({
                "id": str(quiz.id),
                "type": "quiz",
                "title": quiz.title,
                "document_id": str(quiz.document_id),
                "document_title": document.title if document else None,
                "folder_id": str(quiz.folder_id) if quiz.folder_id else None,
                "question_count": question_counts.get(quiz.id, 0),
                "last_score": last_scores.get(quiz.id),
                "created_at": quiz.created_at,
            })

    summaries_query = db.query(Summary).filter(
        Summary.user_id == current_user.id,
        Summary.is_saved.is_(True),
    )

    if folder_id is not None:
        summaries_query = summaries_query.filter(
            Summary.folder_id == folder_id
        )

    if document_id is not None:
        summaries_query = summaries_query.filter(
            Summary.document_id == document_id
        )

    if search:
        summaries_query = summaries_query.filter(
            Summary.title.ilike(f"%{search}%")
        )

    if item_type in (None, "summary"):
        summaries = summaries_query.all()

        for summary in summaries:
            document = db.get(Document, summary.document_id)

            items.append({
                "id": str(document.id),
                "type": "document",
                "title": document.title,
                "status": document.status,
                "document_id": str(document.id),
                "page_count": document.page_count,
                "folder_id": str(document.folder_id) if document.folder_id else None,
                "created_at": document.created_at,
            })

    items.sort(
        key=lambda item: item["created_at"],
        reverse=True,
    )

    return {
        "total_items": len(items),
        "items": items,
    }
