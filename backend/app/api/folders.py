from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.folder import Folder
from app.models.user import User
from app.schemas.folder import FolderCreateRequest, FolderUpdateRequest
from app.models.document import Document
from app.models.quiz import Quiz
from app.models.summary import Summary

router = APIRouter(prefix="/api/folders", tags=["Folders"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_folder(
    request: FolderCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    folder = Folder(
        user_id=current_user.id,
        name=request.name,
    )

    try:
        db.add(folder)
        db.commit()
        db.refresh(folder)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A folder with this name already exists",
        ) from exc

    return {
        "id": str(folder.id),
        "name": folder.name,
        "created_at": folder.created_at,
        "updated_at": folder.updated_at,
    }

@router.get("")
def list_folders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    folders = (
        db.query(Folder)
        .filter(Folder.user_id == current_user.id)
        .order_by(Folder.created_at.desc())
        .all()
    )

    result = []

    for folder in folders:
        document_count = (
            db.query(Document)
            .filter(
                Document.user_id == current_user.id,
                Document.folder_id == folder.id,
                Document.status == "ready",
            )
            .count()
        )

        quiz_count = (
            db.query(Quiz)
            .filter(
                Quiz.user_id == current_user.id,
                Quiz.folder_id == folder.id,
                Quiz.is_saved.is_(True),
            )
            .count()
        )

        summary_count = (
            db.query(Summary)
            .filter(
                Summary.user_id == current_user.id,
                Summary.folder_id == folder.id,
                Summary.is_saved.is_(True),
            )
            .count()
        )

        result.append({
            "id": str(folder.id),
            "name": folder.name,
            "item_count": document_count + quiz_count + summary_count,
            "created_at": folder.created_at,
            "updated_at": folder.updated_at,
        })

    return result

@router.patch("/{folder_id}")
def rename_folder(
    folder_id: str,
    request: FolderUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import uuid

    try:
        parsed_id = uuid.UUID(folder_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid folder ID",
        )

    folder = (
        db.query(Folder)
        .filter(
            Folder.id == parsed_id,
            Folder.user_id == current_user.id,
        )
        .first()
    )

    if folder is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found",
        )

    folder.name = request.name

    try:
        db.commit()
        db.refresh(folder)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A folder with this name already exists",
        ) from exc

    return {
        "id": str(folder.id),
        "name": folder.name,
        "created_at": folder.created_at,
        "updated_at": folder.updated_at,
    }


@router.delete("/{folder_id}")
def delete_folder(
    folder_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import uuid

    try:
        parsed_id = uuid.UUID(folder_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid folder ID",
        )

    folder = (
        db.query(Folder)
        .filter(
            Folder.id == parsed_id,
            Folder.user_id == current_user.id,
        )
        .first()
    )

    if folder is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found",
        )

    db.delete(folder)
    db.commit()

    return {
        "message": "Folder deleted successfully",
        "id": str(parsed_id),
    }