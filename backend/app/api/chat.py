from fastapi import APIRouter

router = APIRouter(prefix="/api/chat", tags=["Chat"])

@router.get("/suggestions")
def get_chat_suggestions():
    return {
        "suggestions": [
            {
                "title": "Explain a concept",
                "prompt": "Explain this concept step by step, using a clear example."
            },
            {
                "title": "Summarize a topic",
                "prompt": "Summarize the main ideas and key concepts of this topic."
            },
            {
                "title": "Test my understanding",
                "prompt": "Ask me questions to test my understanding of this topic."
            },
            {
                "title": "Give me an example",
                "prompt": "Give me a practical example and explain how it works."
            }
        ]
    }
