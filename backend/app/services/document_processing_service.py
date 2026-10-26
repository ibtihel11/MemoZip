from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

from app.core.database import SessionLocal
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.services.chunking_service import chunk_text
from app.services.pdf_service import extract_pdf_text
from app.services.topic_service import extract_and_save_topics
from app.models.topic import Topic

def process_document(document_id: UUID, file_path: str) -> None:
    with SessionLocal() as db:
        document = db.get(Document, document_id)

        if document is None:
            return

        try:
            document.status = "processing"
            document.processing_step = 1
            document.error_message = None
            db.commit()

            with Path(file_path).open("rb") as source:
                file_content = source.read()

            document.processing_step = 2
            db.commit()

            page_count, pages = extract_pdf_text(file_content)

            document.processing_step = 3
            db.commit()

            chunks = []
            chunk_index = 0

            for page in pages:
                for content in chunk_text(page["text"]):
                    chunks.append(
                        DocumentChunk(
                            document_id=document.id,
                            chunk_index=chunk_index,
                            page_start=page["page_number"],
                            page_end=page["page_number"],
                            content=content,
                        )
                    )
                    chunk_index += 1

            db.query(DocumentChunk).filter(
                DocumentChunk.document_id == document.id
            ).delete(synchronize_session=False)

            db.add_all(chunks)
            document.page_count = page_count
            document.processing_step = 4
            db.commit()

            extract_and_save_topics(
                document_id=document.id,
                user_id=document.user_id,
                db=db,
            )

            document.concept_count = (
                db.query(Topic)
                .filter(Topic.document_id == document.id)
                .count()
            )
            db.commit()

            document.status = "ready"
            document.processed_at = datetime.now(timezone.utc)
            document.processing_step = 5
            document.error_message = None
            db.commit()

        except Exception as exc:
            db.rollback()
            document = db.get(Document, document_id)

            if document is not None:
                document.status = "failed"
                document.error_message = str(exc)[:2000]
                document.processed_at = datetime.now(timezone.utc)
                db.commit()
                