import { db, notify } from '@/data/db';
import type { Quiz, QuizAttempt, QuizConfig } from '@/types';
import { uid } from '@/utils/id';
import { joinListShort } from './helpers';
import { delay, NotFoundError } from './http';
import { pickQuestions } from './mockGenerators';
import { buildAttempt } from '@/utils/scoring';

const newestFirst = (a: QuizAttempt, b: QuizAttempt) => +new Date(b.completedAt) - +new Date(a.completedAt);

export const quizzes = {
  async list(): Promise<Quiz[]> {
    await delay();
    return db.quizzes.filter((q) => q.saved);
  },

  async get(id: string): Promise<Quiz> {
    await delay(150);
    const quiz = db.quizzes.find((q) => q.id === id);
    if (!quiz) throw new NotFoundError('quiz');
    return quiz;
  },

  async generate(config: QuizConfig): Promise<Quiz> {
    await delay(2400);
    const doc = db.documents.find((d) => d.id === config.documentId);
    if (!doc) throw new NotFoundError('document');
    const questions = pickQuestions(doc, config);
    const focus = config.topicIds?.length
      ? doc.topics.filter((t) => config.topicIds!.includes(t.id)).map((t) => t.name)
      : [];
    const quiz: Quiz = {
      id: uid('quiz'),
      title: focus.length ? `Review: ${joinListShort(focus)}` : `${doc.title} Quiz`,
      documentId: doc.id,
      createdAt: new Date().toISOString(),
      folderId: doc.folderId,
      difficulty: config.difficulty,
      questions,
      saved: false,
    };
    db.quizzes = [quiz, ...db.quizzes];
    notify();
    return quiz;
  },

  /** Every submit creates a new attempt; earlier attempts are kept as history. */
  async submit(quizId: string, answers: Record<string, string>): Promise<QuizAttempt> {
    await delay(600);
    const quiz = db.quizzes.find((q) => q.id === quizId);
    if (!quiz) throw new NotFoundError('quiz');
    const topics = db.documents.find((d) => d.id === quiz.documentId)?.topics ?? [];
    const attempt = buildAttempt(quiz, topics, answers, uid('att'), new Date().toISOString());
    db.attempts = [attempt, ...db.attempts];
    notify();
    return attempt;
  },

  async attempts(quizId: string): Promise<QuizAttempt[]> {
    await delay(150);
    return db.attempts.filter((a) => a.quizId === quizId).sort(newestFirst);
  },

  async attempt(attemptId: string): Promise<QuizAttempt> {
    await delay(150);
    const a = db.attempts.find((x) => x.id === attemptId);
    if (!a) throw new NotFoundError('result');
    return a;
  },

  async save(id: string): Promise<void> {
    await delay(150);
    db.quizzes = db.quizzes.map((q) => (q.id === id ? { ...q, saved: true } : q));
    notify();
  },

  async rename(id: string, title: string): Promise<void> {
    await delay(150);
    db.quizzes = db.quizzes.map((q) => (q.id === id ? { ...q, title } : q));
    notify();
  },

  async remove(id: string): Promise<void> {
    await delay(200);
    db.quizzes = db.quizzes.filter((q) => q.id !== id);
    db.attempts = db.attempts.filter((a) => a.quizId !== id);
    notify();
  },
};
