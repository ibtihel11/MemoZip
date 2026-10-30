import type { Quiz, QuizAttempt, QuizConfig } from '@/types';
import { notify } from '../invalidate';
import { http } from './http';
import { listOf, mapAttempt, mapQuiz } from './mappers';

// Quiz routes live under /documents/quizzes on this backend.
const base = '/documents/quizzes';

/** One open attempt per quiz while the student is answering (promise, so React StrictMode's double effect starts only one). */
const openAttempts = new Map<string, Promise<string>>();

function startAttempt(quizId: string): Promise<string> {
  let pending = openAttempts.get(quizId);
  if (!pending) {
    pending = http<any>(`${base}/${quizId}/attempts/start`, { method: 'POST' }) // eslint-disable-line @typescript-eslint/no-explicit-any
      .then((raw) => String(raw.attemptId ?? raw.id));
    openAttempts.set(quizId, pending);
    pending.catch(() => openAttempts.delete(quizId));
  }
  return pending;
}

async function getQuiz(id: string): Promise<Quiz> {
  return mapQuiz(await http(`${base}/${id}`));
}

async function getAttempt(attemptId: string): Promise<QuizAttempt> {
  const raw = await http(`${base}/attempts/${attemptId}`);
  // Development aid: shows the exact payload when results look wrong (copy it from the console).
  if (import.meta.env.DEV) console.info('[api] attempt payload', raw);
  return mapAttempt(raw);
}

export const quizzes = {
  /** Saved quizzes only (the ones in the Library). */
  async list(): Promise<Quiz[]> {
    return listOf(await http(`${base}/saved`), 'quizzes').map(mapQuiz);
  },

  get: getQuiz,

  async generate(config: QuizConfig): Promise<Quiz> {
    const raw = await http(`/documents/${config.documentId}/quizzes`, {
      method: 'POST',
      timeoutMs: 120_000,
      json: {
        questionCount: config.count,
        difficulty: config.difficulty,
        questionTypes: config.types,
        // "Review weak topics". Remove this line if the backend does not support focus topics yet.
        ...(config.topicIds?.length ? { topicIds: config.topicIds } : {}),
      },
    });
    const created = mapQuiz(raw);
    // Generated quizzes go straight to the Library (the backend lists saved quizzes only).
    try {
      await http(`${base}/${created.id}/save`, { method: 'PATCH', json: { isSaved: true } });
    } catch {
      /* the Save button on the quiz page still works */
    }
    notify();
    // Some backends answer with just the new quiz's id; load the full quiz in that case.
    return created.questions.length > 0 ? { ...created, saved: true } : getQuiz(created.id);
  },

  startAttempt,

  /**
   * Submits the answers (graded on the backend) and returns the full attempt.
   * `questionIds` lets unanswered questions be sent as empty answers.
   */
  async submit(quizId: string, answers: Record<string, string>, questionIds: string[] = Object.keys(answers)): Promise<QuizAttempt> {
    const attemptId = await startAttempt(quizId);
    const raw = await http(`${base}/${quizId}/attempts`, {
      method: 'POST',
      json: {
        attemptId,
        answers: questionIds.map((questionId) => ({ questionId, answer: answers[questionId] ?? '' })),
      },
    });
    openAttempts.delete(quizId);
    notify();
    const attempt = mapAttempt(raw);
    // The submit response may be a short summary; the attempt endpoint has the full review.
    return attempt.answers.length > 0 ? attempt : getAttempt(attempt.id || attemptId);
  },

  async attempts(quizId: string): Promise<QuizAttempt[]> {
    // Opening a quiz creates an unfinished attempt; only completed ones belong in the history.
    return listOf(await http(`${base}/${quizId}/attempts`), 'attempts')
      .filter((r) => !('completedAt' in r) || r.completedAt)
      .map(mapAttempt);
  },

  attempt: getAttempt,

  async save(id: string): Promise<void> {
    await http(`${base}/${id}/save`, { method: 'PATCH', json: { isSaved: true } });
    notify();
  },

  async rename(id: string, title: string): Promise<void> {
    await http(`${base}/${id}`, { method: 'PATCH', json: { title } });
    notify();
  },

  async remove(id: string): Promise<void> {
    await http(`${base}/${id}`, { method: 'DELETE' });
    notify();
  },
};
