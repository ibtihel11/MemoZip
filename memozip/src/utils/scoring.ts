import type { AnswerRecord, Question, Quiz, QuizAttempt, Topic } from '@/types';

export type MasteryTone = 'strong' | 'good' | 'weak';
export const STRONG_THRESHOLD = 80;
export const WEAK_THRESHOLD = 60;

export const masteryTone = (score: number): MasteryTone =>
  score >= STRONG_THRESHOLD ? 'strong' : score < WEAK_THRESHOLD ? 'weak' : 'good';

export function isCorrect(q: Question, answer: string | undefined): boolean {
  if (!answer || !answer.trim()) return false;
  const given = answer.trim().toLowerCase();
  if (q.type === 'short_answer') {
    const keywords = (q.keywords?.length ? q.keywords : [q.correctAnswer]).map((k) => k.toLowerCase());
    return keywords.some((k) => given.includes(k));
  }
  return given === q.correctAnswer.trim().toLowerCase();
}

export function buildAttempt(
  quiz: Quiz,
  topics: Topic[],
  answers: Record<string, string>,
  id: string,
  completedAt: string,
): QuizAttempt {
  const records: AnswerRecord[] = quiz.questions.map((q) => ({
    questionId: q.id,
    answer: answers[q.id] ?? '',
    correct: isCorrect(q, answers[q.id]),
  }));
  const correctCount = records.filter((r) => r.correct).length;
  const total = quiz.questions.length;

  const byTopic = new Map<string, { right: number; total: number }>();
  quiz.questions.forEach((q, i) => {
    const t = byTopic.get(q.topicId) ?? { right: 0, total: 0 };
    t.total += 1;
    if (records[i].correct) t.right += 1;
    byTopic.set(q.topicId, t);
  });

  return {
    id,
    quizId: quiz.id,
    completedAt,
    score: total ? Math.round((correctCount / total) * 100) : 0,
    correctCount,
    total,
    answers: records,
    topicScores: Array.from(byTopic, ([topicId, t]) => ({
      topicId,
      topicName: topics.find((x) => x.id === topicId)?.name ?? 'Other',
      score: Math.round((t.right / t.total) * 100),
    })),
  };
}

/** Test helper for mock data: answers every question correctly except the ids in `wrong`. */
export function simulateAnswers(quiz: Quiz, wrong: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const q of quiz.questions) {
    if (!wrong.includes(q.id)) out[q.id] = q.correctAnswer;
    else if (q.type === 'short_answer') out[q.id] = 'I am not sure about this one.';
    else out[q.id] = (q.options ?? []).find((o) => o !== q.correctAnswer) ?? '';
  }
  return out;
}
