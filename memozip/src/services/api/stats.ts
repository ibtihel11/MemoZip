import { db } from '@/data/db';
import type { Stats } from '@/types';
import { STRONG_THRESHOLD } from '@/utils/scoring';
import { delay } from './http';

export const stats = {
  async get(): Promise<Stats> {
    await delay(150);
    const attempts = db.attempts;
    const latestPerQuiz = db.quizzes
      .map((q) => attempts.filter((a) => a.quizId === q.id).sort((a, b) => +new Date(b.completedAt) - +new Date(a.completedAt))[0])
      .filter(Boolean);
    const mastery = new Map<string, number>();
    latestPerQuiz.forEach((a) => a.topicScores.forEach((t) => mastery.set(t.topicId, Math.max(mastery.get(t.topicId) ?? 0, t.score))));
    return {
      quizzesCompleted: attempts.length,
      averageScore: attempts.length ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length) : 0,
      topicsMastered: Array.from(mastery.values()).filter((s) => s >= STRONG_THRESHOLD).length,
    };
  },
};
