import { db, notify } from '@/data/db';
import type { Summary } from '@/types';
import { uid } from '@/utils/id';
import { delay, NotFoundError } from './http';
import { synthesizeSummary } from './mockGenerators';

export const summaries = {
  async get(id: string): Promise<Summary> {
    await delay(150);
    const s = db.summaries.find((x) => x.id === id);
    if (!s) throw new NotFoundError('summary');
    return s;
  },

  async generate(documentId: string): Promise<Summary> {
    await delay(2400);
    const doc = db.documents.find((d) => d.id === documentId);
    if (!doc) throw new NotFoundError('document');
    const summary: Summary = {
      id: uid('sum'),
      title: `${doc.title} Summary`,
      documentId,
      createdAt: new Date().toISOString(),
      folderId: doc.folderId,
      saved: false,
      ...synthesizeSummary(doc),
    };
    db.summaries = [summary, ...db.summaries];
    notify();
    return summary;
  },

  async regenerate(id: string): Promise<Summary> {
    await delay(2000);
    const current = db.summaries.find((s) => s.id === id);
    const doc = db.documents.find((d) => d.id === current?.documentId);
    if (!current || !doc) throw new NotFoundError('summary');
    const next: Summary = { ...current, ...synthesizeSummary(doc), createdAt: new Date().toISOString() };
    db.summaries = db.summaries.map((s) => (s.id === id ? next : s));
    notify();
    return next;
  },

  async save(id: string): Promise<void> {
    await delay(150);
    db.summaries = db.summaries.map((s) => (s.id === id ? { ...s, saved: true } : s));
    notify();
  },

  async rename(id: string, title: string): Promise<void> {
    await delay(150);
    db.summaries = db.summaries.map((s) => (s.id === id ? { ...s, title } : s));
    notify();
  },

  async remove(id: string): Promise<void> {
    await delay(200);
    db.summaries = db.summaries.filter((s) => s.id !== id);
    notify();
  },
};
