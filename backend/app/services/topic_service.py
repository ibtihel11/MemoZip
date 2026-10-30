from uuid import UUID

from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.topic import Topic
from app.services.llm_service import extract_topics
from app.services.text_budget import sample_text

def extract_and_save_topics(document_id: UUID, user_id: UUID, db: Session) -> dict:
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

    document_text = sample_text([chunk.content for chunk in chunks]).strip()
    extracted = extract_topics(document_text)

    try:
        topics = []
        existing_topics = {
            topic.name.strip().casefold(): topic
            for topic in db.query(Topic)
            .filter(Topic.document_id == document_id)
            .all()
        }

        for position, item in enumerate(extracted.topics):
            name = item.name.strip()
            if not name:
                continue

            key = name.casefold()
            topic = existing_topics.get(key)

            if topic is None:
                topic = Topic(
                    document_id=document_id,
                    name=name,
                    position=position,
                )
                db.add(topic)
                db.flush()
                existing_topics[key] = topic

            topics.append(topic)

        db.commit()

        return {
            "document_id": str(document_id),
            "topics": [
                {"id": str(topic.id), "name": topic.name}
                for topic in topics
            ],
        }

    except Exception:
        db.rollback()
        raise