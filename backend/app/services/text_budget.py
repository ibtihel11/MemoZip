def sample_text(chunks: list[str], max_chars: int = 60_000) -> str:
    if not chunks:
        return ""
    total = sum(len(c) for c in chunks)
    if total <= max_chars:
        return "\n\n".join(chunks)
    keep = max(1, int(max_chars / (total / len(chunks))))
    step = len(chunks) / keep
    picked = [chunks[int(i * step)] for i in range(keep)]
    return "\n\n".join(picked)[:max_chars]