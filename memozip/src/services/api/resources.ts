import { db, notify } from '@/data/db';
import type { Resource, ResourceType } from '@/types';
import { delay, NotFoundError } from './http';
import { documents } from './documents';
import { quizzes } from './quizzes';
import { summaries } from './summaries';

function buildAll(): Resource[] {
  const titleOf = (docId: string) => db.documents.find((d) => d.id === docId)?.title;
  const docs: Resource[] = db.documents.map((d) => ({
    id: d.id, type: 'document', title: d.title, documentId: d.id, folderId: d.folderId, date: d.createdAt, pages: d.pages,
  }));
  const qs: Resource[] = db.quizzes.filter((q) => q.saved).map((q) => {
    const latest = db.attempts.filter((a) => a.quizId === q.id).sort((a, b) => +new Date(b.completedAt) - +new Date(a.completedAt))[0];
    return {
      id: q.id, type: 'quiz', title: q.title, documentId: q.documentId, sourceTitle: titleOf(q.documentId), folderId: q.folderId,
      date: latest?.completedAt ?? q.createdAt, score: latest?.score, lastAttemptAt: latest?.completedAt, questionCount: q.questions.length,
    };
  });
  const ss: Resource[] = db.summaries.filter((s) => s.saved).map((s) => ({
    id: s.id, type: 'summary', title: s.title, documentId: s.documentId, sourceTitle: titleOf(s.documentId), folderId: s.folderId, date: s.createdAt,
  }));
  return [...docs, ...qs, ...ss].sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export const resources = {
  async list(filter: { type?: ResourceType; folderId?: string; query?: string } = {}): Promise<Resource[]> {
    await delay();
    const q = filter.query?.trim().toLowerCase();
    return buildAll().filter((r) =>
      (!filter.type || r.type === filter.type) &&
      (!filter.folderId || r.folderId === filter.folderId) &&
      (!q || r.title.toLowerCase().includes(q) || r.sourceTitle?.toLowerCase().includes(q)),
    );
  },

  async get(type: ResourceType, id: string): Promise<Resource> {
    await delay(100);
    const r = buildAll().find((x) => x.type === type && x.id === id);
    if (!r) throw new NotFoundError(type);
    return r;
  },

  rename(r: Pick<Resource, 'type' | 'id'>, title: string): Promise<void> {
    if (r.type === 'document') return documents.rename(r.id, title);
    if (r.type === 'quiz') return quizzes.rename(r.id, title);
    return summaries.rename(r.id, title);
  },

  remove(r: Pick<Resource, 'type' | 'id'>): Promise<void> {
    if (r.type === 'document') return documents.remove(r.id);
    if (r.type === 'quiz') return quizzes.remove(r.id);
    return summaries.remove(r.id);
  },

  async move(r: Pick<Resource, 'type' | 'id'>, folderId: string | null): Promise<void> {
    await delay(150);
    if (r.type === 'document') db.documents = db.documents.map((d) => (d.id === r.id ? { ...d, folderId } : d));
    if (r.type === 'quiz') db.quizzes = db.quizzes.map((q) => (q.id === r.id ? { ...q, folderId } : q));
    if (r.type === 'summary') db.summaries = db.summaries.map((s) => (s.id === r.id ? { ...s, folderId } : s));
    notify();
  },
};
