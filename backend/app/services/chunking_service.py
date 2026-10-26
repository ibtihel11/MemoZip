import re

def chunk_text(
    text: str,
    chunk_size: int = 500,
    overlap: int = 50,
) -> list[str]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero")

    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must be between zero and chunk_size")

    text = re.sub(r"[ \t]+", " ", text).strip()

    if not text:
        return []

    sentences = re.split(r"(?<=[.!?])\s+|\n+", text)
    chunks = []
    current_words = []

    for sentence in sentences:
        sentence_words = sentence.split()

        if not sentence_words:
            continue

        if len(sentence_words) > chunk_size:
            if current_words:
                chunks.append(" ".join(current_words))
                current_words = []

            for start in range(0, len(sentence_words), chunk_size - overlap):
                part = sentence_words[start : start + chunk_size]
                if part:
                    chunks.append(" ".join(part))

                if start + chunk_size >= len(sentence_words):
                    break

            continue

        if len(current_words) + len(sentence_words) > chunk_size:
            chunks.append(" ".join(current_words))
            current_words = current_words[-overlap:] if overlap else []

        current_words.extend(sentence_words)

    if current_words:
        chunks.append(" ".join(current_words))

    return chunks
