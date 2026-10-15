from google import genai
from app.core.config import settings
import json
from app.schemas.summary import SummaryGenerated
from app.schemas.topic import ExtractedTopics
from app.schemas.quiz import GeneratedQuiz

client = genai.Client(api_key=settings.gemini_api_key)

def generate_text(prompt: str) -> str:
    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt,
    )

    if not response.text:
        raise ValueError("The LLM returned an empty response")

    return response.text

def generate_summary(document_text: str) -> SummaryGenerated:
    prompt = f"""
    You are MemoZip, an AI study assistant.

    Create a clear, accurate study summary from the course content below.

    Requirements:
    - Use the same language as the source material.
    - Give the summary a concise, descriptive title.
    - Write an overview explaining the main ideas.
    - Extract 5 to 10 important key points when the material supports that many.
    - Identify the main concepts and explain each one clearly.
    - Do not invent facts that are not supported by the source.
    - Return only valid JSON with these fields:
    title, overview, key_points, concepts.
    - Each concept must contain title and body.

    Course content:
    {document_text}
    """

    raw_response = generate_text(prompt)

    try:
        cleaned_response = raw_response.strip()

        if cleaned_response.startswith("```"):
            cleaned_response = cleaned_response.split("\n", 1)[1]
            cleaned_response = cleaned_response.rsplit("```", 1)[0].strip()

        data = json.loads(cleaned_response)
        return SummaryGenerated.model_validate(data)
    except (json.JSONDecodeError, ValueError) as exc:
        raise ValueError("Gemini returned an invalid summary response") from exc

def extract_topics(document_text: str) -> ExtractedTopics:
    prompt = f"""
    You are MemoZip, an AI study assistant.

    Identify the main educational topics covered in the course content.

    Requirements:
    - Use the same language as the source material.
    - Extract between 3 and 10 distinct topics when the content supports that many.
    - Give each topic a short, descriptive name.
    - Avoid duplicate or overly broad topics.
    - Include only topics supported by the source.
    - Return only valid JSON with one field: topics.
    - Each item in topics must contain a name field.

    Course content:
    {document_text}
    """

    raw_response = generate_text(prompt)

    try:
        cleaned_response = raw_response.strip()

        if cleaned_response.startswith("```"):
            cleaned_response = cleaned_response.split("\n", 1)[1]
            cleaned_response = cleaned_response.rsplit("```", 1)[0].strip()

        data = json.loads(cleaned_response)
        return ExtractedTopics.model_validate(data)
    except (json.JSONDecodeError, ValueError) as exc:
        raise ValueError("Gemini returned an invalid topics response") from exc

def generate_quiz(document_text: str, question_count: int, difficulty: str, question_types: list[str], topic_names: list[str]) -> GeneratedQuiz:
    topics = ", ".join(topic_names)

    prompt = f"""
    You are MemoZip, an AI study assistant.
    Generate a quiz based only on the course content below.

    Requirements:
    - Generate exactly {question_count} questions.
    - Overall difficulty: {difficulty}.
    - Use only these question types: {", ".join(question_types)}.
    - Focus on these topics: {topics}.
    - Use the same language as the course content.
    - Avoid duplicate questions.
    - Ensure every answer is supported by the course content.
    - For multiple_choice questions, provide an options object
      with keys such as A, B, C, D and their corresponding answers.
    - For multiple_choice questions, correct_answer must be
      the key of the correct option, such as A.
    - For true_false questions, correct_answer must be "true"
      or "false", and options must be null.
    - For short_answer questions, options must be null.
    - Include keywords only when useful for short-answer questions.
    - Include a brief explanation for every correct answer.
    - Each question must contain:
      topic, type, difficulty, prompt, options,
      correct_answer, keywords, explanation.
    - Return only valid JSON with these fields:
      title, questions.
    Course content:
    {document_text}
    """
    
    raw_response = generate_text(prompt)

    try:
        cleaned_response = raw_response.strip()

        if cleaned_response.startswith("```"):
            cleaned_response = cleaned_response.split("\n", 1)[1]
            cleaned_response = cleaned_response.rsplit("```", 1)[0].strip()

        data = json.loads(cleaned_response)
        quiz = GeneratedQuiz.model_validate(data)

        if len(quiz.questions) != question_count:
            raise ValueError("The generated question count is incorrect")

        return quiz

    except (json.JSONDecodeError, ValueError) as exc:
        raise ValueError("Gemini returned an invalid quiz response") from exc

    except (json.JSONDecodeError, ValueError) as exc:
        raise ValueError("Gemini returned an invalid quiz response") from exc

def evaluate_short_answer(question: str, expected_answer: str, student_answer: str, keywords: list[str] | None = None) -> dict:
    prompt = f"""
    You are MemoZip, an educational answer evaluator.

    Evaluate the student's answer based only on the question
    and expected answer.

    Question: {question}
    Expected answer: {expected_answer}
    Accepted keywords: {json.dumps(keywords or [], ensure_ascii=False)}
    Student answer: {student_answer}

    Requirements:
    - Accept answers that express the same meaning, even with different wording.
    - Accept reasonable paraphrases and equivalent terminology.
    - Do not require exact wording.
    - Reject answers that are factually incorrect or miss the essential idea.
    - Do not accept an answer merely because it contains a keyword.
    - Be fair with minor spelling or grammatical mistakes.
    - Give a brief explanation in the same language as the question.
    - Return only valid JSON with these fields:
      is_correct (boolean), feedback (string).

    """

    raw_response = generate_text(prompt)

    try:
        cleaned_response = raw_response.strip()

        if cleaned_response.startswith("```"):
            cleaned_response = cleaned_response.split("\n", 1)[1]
            cleaned_response = cleaned_response.rsplit("```", 1)[0].strip()

        data = json.loads(cleaned_response)

        if not isinstance(data.get("is_correct"), bool):
            raise ValueError("is_correct must be a boolean")

        if not isinstance(data.get("feedback"), str):
            raise ValueError("feedback must be a string")

        return data

    except (json.JSONDecodeError, ValueError) as exc:
        raise ValueError("Gemini returned an invalid evaluation response") from exc