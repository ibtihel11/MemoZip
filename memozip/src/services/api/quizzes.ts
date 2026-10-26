import type { Quiz, Question, QuizAttempt, QuizConfig } from '@/types';
import { http } from './http';

interface ApiQuestion {
  id: string;
  topic_id: string;
  type: Question['type'];
  difficulty: Question['difficulty'];
  prompt: string;
  options: Record<string, string> | null;
}

interface ApiQuiz {
  id: string;
  document_id: string;
  title: string;
  difficulty: Quiz['difficulty'];
  requested_count: number;
  question_types: string[];
  is_saved: boolean;
  created_at: string;
  questions: ApiQuestion[];
}

interface ApiSavedQuiz {
  id: string;
  document_id: string;
  title: string;
  difficulty: Quiz['difficulty'];
  requested_count: number;
  question_types: string[];
  is_saved: boolean;
  created_at: string;
}

interface ApiAttemptStart {
  attempt_id: string;
  quiz_id: string;
  started_at: string;
  total_count: number;
}

interface ApiAnswerResult {
  question_id: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
}

interface ApiAttemptSubmissionResult {
  attempt_id: string;
  quiz_id: string;
  total_count: number;
  correct_count: number;
  score: number;
  results: ApiAnswerResult[];
}

interface ApiAttemptDetail extends ApiAttemptSubmissionResult {
  completed_at: string;
  duration_seconds: number | null;
  analysis_text: string | null;
  results: (ApiAnswerResult & { prompt: string })[];
  topic_scores: {
    topic_id: string;
    topic_name: string;
    score: number;
    correct_count: number;
    total_count: number;
  }[];
}

interface ApiAttemptHistory {
  attempt_id: string;
  score: number;
  total_count: number;
  correct_count: number;
  completed_at: string;
  duration_seconds: number | null;
  analysis_text: string | null;
}

function mapQuiz(data: ApiQuiz): Quiz {
  return {
    id: data.id,
    title: data.title,
    documentId: data.document_id,
    createdAt: data.created_at,
    folderId: null,
    difficulty: data.difficulty,
    saved: data.is_saved,
    questions: data.questions.map((question) => ({
      id: question.id,
      type: question.type,
      prompt: question.prompt,
      options: question.options
        ? Object.values(question.options)
        : undefined,
      correctAnswer: '',
      explanation: '',
      topicId: question.topic_id,
      difficulty: question.difficulty,
    })),
  };
}

function mapSavedQuiz(data: ApiSavedQuiz): Quiz {
  return {
    id: data.id,
    title: data.title,
    documentId: data.document_id,
    createdAt: data.created_at,
    folderId: null,
    difficulty: data.difficulty,
    saved: data.is_saved,
    questions: [],
  };
}

function mapAttemptResult(item: ApiAttemptSubmissionResult, completedAt: string): QuizAttempt {
  return {
    id: item.attempt_id,
    quizId: item.quiz_id,
    completedAt,
    score: item.score,
    correctCount: item.correct_count,
    total: item.total_count,
    answers: item.results.map((result) => ({
      questionId: result.question_id,
      answer: result.user_answer,
      correct: result.is_correct,
    })),
    topicScores: [],
  };
}

function mapAttemptDetail(item: ApiAttemptDetail): QuizAttempt {
  return {
    id: item.attempt_id,
    quizId: item.quiz_id,
    completedAt: item.completed_at,
    score: item.score,
    correctCount: item.correct_count,
    total: item.total_count,
    answers: item.results.map((result) => ({
      questionId: result.question_id,
      answer: result.user_answer,
      correct: result.is_correct,
    })),
    topicScores: item.topic_scores.map((topic) => ({
      topicId: topic.topic_id,
      topicName: topic.topic_name,
      score: topic.score,
    })),
  };
}

export const quizzes = {
  async list(): Promise<Quiz[]> {
    const data = await http<ApiSavedQuiz[]>('/documents/quizzes/saved');
    return data.map(mapSavedQuiz);
  },

  async get(id: string): Promise<Quiz> {
    const data = await http<ApiQuiz>(`/documents/quizzes/${id}`);
    return mapQuiz(data);
  },

  async generate(config: QuizConfig): Promise<Quiz> {
    const data = await http<ApiQuiz>(
      `/documents/${config.documentId}/quizzes`,
      {
        method: 'POST',
        body: JSON.stringify({
          question_count: config.count,
          difficulty: config.difficulty,
          question_types: config.types,
        }),
      },
    );

    return mapQuiz(data);
  },

  async submit(
    quizId: string,
    answers: Record<string, string>,
  ): Promise<QuizAttempt> {
    const started = await http<ApiAttemptStart>(
      `/documents/quizzes/${quizId}/attempts/start`,
      { method: 'POST' },
    );

    const result = await http<ApiAttemptSubmissionResult>(
      `/documents/quizzes/${quizId}/attempts`,
      {
        method: 'POST',
        body: JSON.stringify({
          attempt_id: started.attempt_id,
          answers: Object.entries(answers).map(([question_id, answer]) => ({
            question_id,
            answer,
          })),
        }),
      },
    );

    return mapAttemptResult(result, new Date().toISOString());
  },

  async attempts(quizId: string): Promise<QuizAttempt[]> {
    const data = await http<ApiAttemptHistory[]>(
      `/documents/quizzes/${quizId}/attempts`,
    );

    return data.map((item) => ({
      id: item.attempt_id,
      quizId,
      completedAt: item.completed_at,
      score: item.score,
      correctCount: item.correct_count,
      total: item.total_count,
      answers: [],
      topicScores: [],
    }));
  },

  async attempt(attemptId: string): Promise<QuizAttempt> {
    const item = await http<ApiAttemptDetail>(
      `/documents/quizzes/attempts/${attemptId}`,
    );

    return mapAttemptDetail(item);
  },

  async save(id: string): Promise<void> {
    await http(`/documents/quizzes/${id}/save`, {
      method: 'PATCH',
      body: JSON.stringify({ is_saved: true }),
    });
  },

  async rename(id: string, title: string): Promise<void> {
    await http(`/documents/quizzes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  },

  async remove(id: string): Promise<void> {
    await http(`/documents/quizzes/${id}`, {
      method: 'DELETE',
    });
  },
};