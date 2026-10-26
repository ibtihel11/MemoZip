import hashlib
from pathlib import Path
from uuid import uuid4
from uuid import UUID
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.schemas.summary import SummarySaveRequest
from app.services.summary_service import delete_summary, regenerate_summary, set_summary_saved
from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.user import User
from app.services.pdf_service import extract_pdf_text
from app.services.chunking_service import chunk_text
from app.services.summary_service import create_summary, get_document_summary
from app.services.topic_service import extract_and_save_topics 
from app.services.quiz_service import create_quiz, get_quiz, set_quiz_saved, get_saved_quizzes, delete_quiz, update_quiz
from app.services.attempt_service import submit_quiz_attempt, get_quiz_attempt, get_quiz_attempt_history, start_quiz_attempt
from app.schemas.quiz import QuizGenerationRequest, QuizUpdateRequest, QuizSaveRequest, QuizAttemptSubmission
from app.models.folder import Folder
from app.schemas.document import DocumentUpdateRequest
from app.models.topic import Topic
from app.services.document_processing_service import process_document

router = APIRouter(prefix="/api/documents", tags=["Documents"])

MAX_FILE_SIZE = 30 * 1024 * 1024
CHUNK_SIZE = 1024 * 1024

@router.get("")
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    documents = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
        .all()
    )

    return [
        {
            "id": str(document.id),
            "title": document.title,
            "file_name": document.file_name,
            "folder_id": str(document.folder_id) if document.folder_id else None,
            "page_count": document.page_count,
            "concept_count": document.concept_count,
            "status": document.status,
            "processing_step": document.processing_step,
            "error_message": document.error_message,
            "created_at": document.created_at,
            "updated_at": document.updated_at,
        }
        for document in documents
    ]
    

@router.get("/{document_id}")
def get_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
        .first()
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    topics = (
        db.query(Topic)
        .filter(Topic.document_id == document.id)
        .order_by(Topic.position.asc())
        .all()
    )

    return {
        "id": str(document.id),
        "title": document.title,
        "file_name": document.file_name,
        "folder_id": str(document.folder_id) if document.folder_id else None,
        "page_count": document.page_count,
        "concept_count": document.concept_count,
        "status": document.status,
        "processing_step": document.processing_step,
        "error_message": document.error_message,
        "created_at": document.created_at,
        "updated_at": document.updated_at,
        "processed_at": document.processed_at,
        "topics": [
            {
                "id": str(topic.id),
                "name": topic.name,
                "position": topic.position,
            }
            for topic in topics
        ],
    }

@router.patch("/{document_id}")
def update_document(
    document_id: uuid.UUID,
    request: DocumentUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
        .first()
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    updates = request.model_fields_set

    if "title" in updates:
        if request.title is None or not request.title.strip():
            raise HTTPException(
                status_code=422,
                detail="Title cannot be empty",
            )
        document.title = request.title.strip()

    if "folder_id" in updates:
        if request.folder_id is None:
            document.folder_id = None
        else:
            folder = (
                db.query(Folder)
                .filter(
                    Folder.id == request.folder_id,
                    Folder.user_id == current_user.id,
                )
                .first()
            )

            if folder is None:
                raise HTTPException(
                    status_code=404,
                    detail="Folder not found",
                )

            document.folder_id = folder.id

    db.commit()
    db.refresh(document)

    return {
        "id": str(document.id),
        "title": document.title,
        "file_name": document.file_name,
        "folder_id": str(document.folder_id) if document.folder_id else None,
        "updated_at": document.updated_at,
    }

@router.delete("/{document_id}")
def delete_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
        .first()
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    file_path = Path(settings.upload_dir) / document.storage_key

    try:
        db.delete(document)
        db.commit()
    except Exception:
        db.rollback()
        raise

    file_path.unlink(missing_ok=True)

    return {
        "message": "Document deleted successfully",
        "id": str(document_id),
    }
 
@router.post("/upload", status_code=status.HTTP_201_CREATED)
def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    original_name = Path(file.filename or "").name

    if not original_name.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed",
        )

    if file.content_type not in (
        "application/pdf",
        "application/octet-stream",
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid content type",
        )

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    storage_key = f"{uuid4()}.pdf"
    file_path = upload_dir / storage_key
    file_hash = hashlib.sha256()
    total_size = 0
    header = b""

    try:
        with file_path.open("wb") as destination:
            while chunk := file.file.read(CHUNK_SIZE):
                if not header:
                    header = chunk[:5]

                total_size += len(chunk)

                if total_size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="PDF must not exceed 30 MiB",
                    )

                file_hash.update(chunk)
                destination.write(chunk)

        if header != b"%PDF-":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded file is not a valid PDF",
            )

        document = Document(
            user_id=current_user.id,
            title=Path(original_name).stem or "Untitled document",
            file_name=original_name,
            storage_key=storage_key,
            mime_type="application/pdf",
            size_bytes=total_size,
            sha256=file_hash.hexdigest(),
        )

        db.add(document)
        db.commit()
        db.refresh(document)

        background_tasks.add_task(
            process_document,
            document.id,
            str(file_path),
        )

        return {
            "id": str(document.id),
            "title": document.title,
            "file_name": document.file_name,
            "size_bytes": document.size_bytes,
            "page_count": document.page_count,
            "status": document.status,
            "processing_step": document.processing_step,
            "created_at": document.created_at,
        }

    except Exception:
        db.rollback()
        file_path.unlink(missing_ok=True)
        raise

    finally:
        file.file.close()

@router.post("/{document_id}/summary")
def generate_document_summary(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_summary(
        document_id=document_id,
        user_id=current_user.id,
        db=db,
    )

@router.get("/{document_id}/summary")
def get_document_summary_endpoint(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_document_summary(
        document_id=document_id,
        user_id=current_user.id,
        db=db,
    )
    
@router.post("/{document_id}/topics")
def generate_document_topics(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return extract_and_save_topics(
        document_id=document_id,
        user_id=current_user.id,
        db=db,
    )

@router.post("/{document_id}/quizzes")
def generate_document_quiz(
    document_id: UUID,
    request: QuizGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_quiz(
        document_id=document_id,
        user_id=current_user.id,
        question_count=request.question_count,
        difficulty=request.difficulty,
        question_types=request.question_types,
        db=db,
    )

@router.get("/quizzes/saved")
def list_saved_document_quizzes(db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    return get_saved_quizzes(
        user_id=current_user.id,
        db=db,
    )
    
@router.get("/quizzes/{quiz_id}")
def get_document_quiz(
    quiz_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_quiz(
        quiz_id=quiz_id,
        user_id=current_user.id,
        db=db,
    )

@router.patch("/quizzes/{quiz_id}/save")
def save_document_quiz(
    quiz_id: UUID,
    request: QuizSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return set_quiz_saved(
        quiz_id=quiz_id,
        user_id=current_user.id,
        is_saved=request.is_saved,
        db=db,
    )

@router.post("/quizzes/{quiz_id}/attempts", status_code=status.HTTP_201_CREATED)
def submit_document_quiz_attempt(quiz_id: UUID, request: QuizAttemptSubmission, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return submit_quiz_attempt(
            quiz_id=quiz_id,
            user_id=current_user.id,
            attempt_id=UUID(request.attempt_id),
            answers=[
                {
                    "question_id": str(answer.question_id),
                    "answer": answer.answer,
                }
                for answer in request.answers
            ],
            db=db,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get("/quizzes/attempts/{attempt_id}")
def get_document_quiz_attempt(
    attempt_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return get_quiz_attempt(
            attempt_id=attempt_id,
            user_id=current_user.id,
            db=db,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

@router.get("/quizzes/{quiz_id}/attempts")
def get_document_quiz_attempt_history(
    quiz_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return get_quiz_attempt_history(
            quiz_id=quiz_id,
            user_id=current_user.id,
            db=db,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.post("/quizzes/{quiz_id}/attempts/start", status_code=status.HTTP_201_CREATED)
def start_document_quiz_attempt(
    quiz_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return start_quiz_attempt(
            quiz_id=quiz_id,
            user_id=current_user.id,
            db=db,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

@router.patch("/summaries/{summary_id}/save")
def save_document_summary(
    summary_id: UUID,
    request: SummarySaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return set_summary_saved(
        summary_id=summary_id,
        user_id=current_user.id,
        is_saved=request.is_saved,
        db=db,
    )

@router.delete("/quizzes/{quiz_id}")
def delete_document_quiz(
    quiz_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return delete_quiz(
            quiz_id=quiz_id,
            user_id=current_user.id,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.patch("/quizzes/{quiz_id}")
def patch_document_quiz(
    quiz_id: UUID,
    payload: QuizUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return update_quiz(
            quiz_id=quiz_id,
            user_id=current_user.id,
            updates=payload.model_dump(exclude_unset=True),
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/summaries/{summary_id}")
def remove_summary(
    summary_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return delete_summary(
        summary_id=summary_id,
        user_id=current_user.id,
        db=db,
    )

@router.post("/summaries/{summary_id}/regenerate")
def regenerate_document_summary(
    summary_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return regenerate_summary(
        summary_id=summary_id,
        user_id=current_user.id,
        db=db,
    )

from app.schemas.summary import SummaryUpdateRequest
from app.services.summary_service import update_summary

@router.patch("/summaries/{summary_id}")
def update_document_summary(
    summary_id: UUID,
    payload: SummaryUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_summary(
        summary_id=summary_id,
        user_id=current_user.id,
        data=payload.model_dump(exclude_unset=True),
        db=db,
    )


@router.post("/{document_id}/retry", status_code=status.HTTP_202_ACCEPTED)
def retry_document(
    document_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
        .first()
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    if document.status != "failed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only failed documents can be retried",
        )

    file_path = Path(settings.upload_dir) / document.storage_key

    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original PDF not found. Please upload the document again.",
        )

    document.status = "uploaded"
    document.processing_step = 0
    document.error_message = None
    document.processed_at = None

    db.commit()

    background_tasks.add_task(
        process_document,
        document.id,
        str(file_path),
    )

    return {
        "id": str(document.id),
        "status": document.status,
        "processing_step": document.processing_step,
        "message": "Document processing has been restarted",
    }
