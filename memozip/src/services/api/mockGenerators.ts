/**
 * Stand-ins for the AI features (quiz generation, summaries, Q&A).
 * The real versions run on the backend; delete this file once they exist.
 */
import { db } from '@/data/db';
import { qaEntries, summaryTemplates, type SummaryTemplate } from '@/data/mockData';
import type { Document, Question, QuizConfig, SourceRef } from '@/types';
import { uid } from '@/utils/id';

const shuffle = <T,>(items: T[]): T[] => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Placeholder questions for documents that have no authored question bank (e.g. fresh uploads). */
function synthesizeQuestions(doc: Document, count: number, topicIds?: string[]): Question[] {
  const topics = doc.topics.filter((t) => !topicIds?.length || topicIds.includes(t.id));
  const pool = topics.length ? topics : doc.topics;
  const note = 'Demo question. Real questions will be generated from your document by the backend.';
  return Array.from({ length: Math.min(count, 10) }, (_, i) => {
    const t = pool[i % pool.length];
    if (i % 3 === 2) {
      return {
        id: uid('q'), type: 'true_false' as const, options: ['True', 'False'], correctAnswer: 'True',
        prompt: `“${t.name}” is one of the topics covered in this course.`, explanation: note, topicId: t.id, difficulty: 'easy' as const,
      };
    }
    const correct = `A key concept explained in the “${t.name}” section`;
    return {
      id: uid('q'), type: 'multiple_choice' as const,
      options: shuffle([correct, 'A topic from an unrelated course', 'A rule for formatting citations', 'A hardware specification']),
      correctAnswer: correct, prompt: `Which statement best fits the section on “${t.name}”?`, explanation: note, topicId: t.id, difficulty: 'easy' as const,
    };
  });
}

export function pickQuestions(doc: Document, config: QuizConfig): Question[] {
  const seen = new Set<string>();
  const bank = db.quizzes
    .filter((q) => q.documentId === doc.id)
    .flatMap((q) => q.questions)
    .filter((q) => (seen.has(q.id) ? false : (seen.add(q.id), true)));

  if (!bank.length) return synthesizeQuestions(doc, config.count, config.topicIds);

  let pool = bank.filter((q) => config.types.includes(q.type));
  if (config.topicIds?.length) pool = pool.filter((q) => config.topicIds!.includes(q.topicId));
  if (config.difficulty !== 'mixed') {
    const exact = pool.filter((q) => q.difficulty === config.difficulty);
    if (exact.length >= 3) pool = exact;
  }
  if (!pool.length) pool = bank;
  return shuffle(pool).slice(0, config.count).map((q) => ({ ...q, id: uid('q') }));
}

export function synthesizeSummary(doc: Document): SummaryTemplate {
  const template = summaryTemplates[doc.id];
  if (template) return template;
  const names = doc.topics.map((t) => t.name);
  return {
    overview: `${doc.title} is organised around ${names.length} main topics: ${names.join(', ')}. This overview is a demo placeholder; the backend will write a real summary from your document.`,
    concepts: doc.topics.slice(0, 5).map((t) => ({
      title: t.name,
      body: `Demo placeholder. This section will explain ${t.name} in your course's own terms, with the most important definitions highlighted.`,
    })),
    keyPoints: names.slice(0, 4).map((n) => `Make sure you can explain ${n} in your own words.`),
  };
}

export function answerQuestion(doc: Document, question: string): { answer: string; source: SourceRef } {
  const q = question.toLowerCase();
  const hit = qaEntries.find((e) => e.documentId === doc.id && e.keywords.some((k) => q.includes(k)));
  if (hit) return { answer: hit.answer, source: { pages: hit.pages, section: hit.section } };

  const t = doc.topics.find((x) => q.includes(x.name.toLowerCase())) ?? doc.topics[0];
  const i = Math.max(0, doc.topics.indexOf(t));
  return {
    answer: `I couldn't find a direct answer to that in your course. The closest material is the section on “${t.name}”. Try asking about a specific idea from it, for example a definition or how it works.`,
    source: { pages: `${3 + i * 6}–${5 + i * 6}`, section: t.name },
  };
}

const SMALL_TALK = /^\s*(hi|hello|hey|thanks|thank you|merci)\b/i;

/** Mock for AI Chat with "All my courses": the backend should search every course and cite where the answer came from. */
export function answerAcrossCourses(docs: Document[], question: string): { answer: string; source?: SourceRef } {
  if (SMALL_TALK.test(question) && question.trim().split(/\s+/).length <= 3) {
    return { answer: 'Hi! Ask me about anything in your courses and I’ll answer from your material, with the pages it came from.' };
  }
  const q = question.toLowerCase();
  for (const doc of docs) {
    const hit = qaEntries.find((e) => e.documentId === doc.id && e.keywords.some((k) => q.includes(k)));
    if (hit) {
      return { answer: hit.answer, source: { pages: hit.pages, section: hit.section, documentId: doc.id, documentTitle: doc.title } };
    }
  }
  const topic = docs.flatMap((d) => d.topics.map((t) => ({ d, t }))).find(({ t }) => q.includes(t.name.toLowerCase()));
  if (topic) {
    return {
      answer: `I couldn't find a direct answer to that. The closest material is “${topic.t.name}” in ${topic.d.title}. Try asking about a specific idea from it, like a definition or how it works.`,
      source: { pages: '—', section: topic.t.name, documentId: topic.d.id, documentTitle: topic.d.title },
    };
  }
  return { answer: 'I couldn’t find that in your courses. Try rephrasing, or pick a single course above to narrow things down.' };
}
