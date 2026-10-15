
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.summary import Summary
from app.models.summary_concept import SummaryConcept
from app.schemas.summary import SummaryGenerated
from app.services.llm_service import generate_summary
from app.models.folder import Folder
from app.schemas.summary import SummaryGenerated, SummaryUpdateRequest

def create_summary(
    document_id: UUID,
    user_id: UUID,
    db: Session,
) -> dict:
    document = db.scalar(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == user_id,
        )
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    chunks = db.scalars(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index)
    ).all()

    document_text = "\n\n".join(
        chunk.content for chunk in chunks
    ).strip()

    if not document_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The document contains no text to summarize",
        )

    try:
        generated: SummaryGenerated = generate_summary(document_text)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to generate the summary with the AI service",
        ) from exc

    summary = Summary(
        user_id=user_id,
        document_id=document.id,
        title=generated.title,
        overview=generated.overview,
        key_points=generated.key_points,
    )

    try:
        db.add(summary)
        db.flush()

        for position, concept in enumerate(generated.concepts):
            db.add(
                SummaryConcept(
                    summary_id=summary.id,
                    position=position,
                    title=concept.title,
                    body=concept.body,
                )
            )

        db.commit()
        db.refresh(summary)

    except Exception:
        db.rollback()
        raise

    return {
        "id": str(summary.id),
        "document_id": str(summary.document_id),
        "title": summary.title,
        "overview": summary.overview,
        "key_points": summary.key_points,
        "concepts": [
            {
                "title": concept.title,
                "body": concept.body,
            }
            for concept in generated.concepts
        ],
        "is_saved": summary.is_saved,
        "created_at": summary.created_at,
    }

def get_document_summary(
    document_id: UUID,
    user_id: UUID,
    db: Session,
) -> dict:
    document = db.scalar(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == user_id,
        )
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    summary = db.scalar(
        select(Summary)
        .where(
            Summary.document_id == document_id,
            Summary.user_id == user_id,
        )
        .order_by(Summary.created_at.desc())
        .limit(1)
    )

    if summary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No summary found for this document",
        )

    concepts = db.scalars(
        select(SummaryConcept)
        .where(SummaryConcept.summary_id == summary.id)
        .order_by(SummaryConcept.position)
    ).all()

    return {
        "id": str(summary.id),
        "document_id": str(summary.document_id),
        "title": summary.title,
        "overview": summary.overview,
        "key_points": summary.key_points,
        "concepts": [
            {
                "title": concept.title,
                "body": concept.body,
            }
            for concept in concepts
        ],
        "is_saved": summary.is_saved,
        "created_at": summary.created_at,
    }


def set_summary_saved(
    summary_id: UUID,
    user_id: UUID,
    is_saved: bool,
    db: Session,
) -> dict:
    summary = db.scalar(
        select(Summary).where(
            Summary.id == summary_id,
            Summary.user_id == user_id,
        )
    )

    if summary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Summary not found",
        )

    summary.is_saved = is_saved

    try:
        db.commit()
        db.refresh(summary)
    except Exception:
        db.rollback()
        raise

    return {
        "id": str(summary.id),
        "title": summary.title,
        "is_saved": summary.is_saved,
        "folder_id": str(summary.folder_id) if summary.folder_id else None,
        "updated_at": summary.updated_at,
    }

def get_summary_by_id(
    summary_id: UUID,
    user_id: UUID,
    db: Session,
) -> dict:
    summary = db.scalar(
        select(Summary).where(
            Summary.id == summary_id,
            Summary.user_id == user_id,
        )
    )

    if summary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Summary not found",
        )

    concepts = db.scalars(
        select(SummaryConcept)
        .where(SummaryConcept.summary_id == summary.id)
        .order_by(SummaryConcept.position)
    ).all()

    return {
        "id": str(summary.id),
        "document_id": str(summary.document_id),
        "title": summary.title,
        "overview": summary.overview,
        "key_points": summary.key_points,
        "concepts": [
            {
                "title": concept.title,
                "body": concept.body,
            }
            for concept in concepts
        ],
        "is_saved": summary.is_saved,
        "folder_id": str(summary.folder_id) if summary.folder_id else None,
        "created_at": summary.created_at,
    }

def delete_summary(
    summary_id: UUID,
    user_id: UUID,
    db: Session,
) -> dict:
    summary = db.scalar(
        select(Summary).where(
            Summary.id == summary_id,
            Summary.user_id == user_id,
        )
    )

    if summary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Summary not found",
        )

    try:
        db.delete(summary)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "id": str(summary_id),
        "deleted": True,
    }

def regenerate_summary(
    summary_id: UUID,
    user_id: UUID,
    db: Session,
) -> dict:
    summary = db.scalar(
        select(Summary).where(
            Summary.id == summary_id,
            Summary.user_id == user_id,
        )
    )

    if summary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Summary not found",
        )

    chunks = db.scalars(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == summary.document_id)
        .order_by(DocumentChunk.chunk_index)
    ).all()

    document_text = "\n\n".join(
        chunk.content for chunk in chunks
    ).strip()

    if not document_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The document contains no text to summarize",
        )

    try:
        generated: SummaryGenerated = generate_summary(document_text)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to regenerate the summary with the AI service",
        ) from exc

    try:
        db.query(SummaryConcept).filter(
            SummaryConcept.summary_id == summary.id
        ).delete(synchronize_session=False)

        summary.title = generated.title
        summary.overview = generated.overview
        summary.key_points = generated.key_points
        summary.version += 1

        for position, concept in enumerate(generated.concepts):
            db.add(
                SummaryConcept(
                    summary_id=summary.id,
                    position=position,
                    title=concept.title,
                    body=concept.body,
                )
            )

        db.commit()
        db.refresh(summary)

    except Exception:
        db.rollback()
        raise

    return get_summary_by_id(
        summary_id=summary.id,
        user_id=user_id,
        db=db,
    )

def update_summary(
    summary_id: UUID,
    user_id: UUID,
    data: dict,
    db: Session,
) -> dict:
    summary = db.scalar(
        select(Summary).where(
            Summary.id == summary_id,
            Summary.user_id == user_id,
        )
    )

    if summary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Summary not found",
        )

    if data.get("title") is not None:
        title = data["title"].strip()
        if not title:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Title cannot be empty",
            )
        summary.title = title

    if data.get("is_saved") is not None:
        summary.is_saved = data["is_saved"]

        if not summary.is_saved:
            summary.folder_id = None

    if "folder_id" in data:
        folder_id = data["folder_id"]

        if folder_id is None:
            summary.folder_id = None
        else:
            try:
                folder_uuid = UUID(folder_id)
            except (ValueError, TypeError, AttributeError):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid folder ID",
                )

            if not summary.is_saved:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Save the summary before assigning it to a folder",
                )

            folder = db.scalar(
                select(Folder).where(
                    Folder.id == folder_uuid,
                    Folder.user_id == user_id,
                )
            )

            if folder is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Folder not found",
                )

            summary.folder_id = folder.id

    try:
        db.commit()
        db.refresh(summary)
    except Exception:
        db.rollback()
        raise

    return {
        "id": str(summary.id),
        "title": summary.title,
        "is_saved": summary.is_saved,
        "folder_id": str(summary.folder_id) if summary.folder_id else None,
        "updated_at": summary.updated_at,
    }
