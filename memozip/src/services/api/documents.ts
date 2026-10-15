import { db, notify } from '@/data/db';
import type { Document } from '@/types';
import { titleFromFileName } from '@/utils/format';
import { uid } from '@/utils/id';
import { delay, NotFoundError } from './http';

const byNewest = <T extends { createdAt: string }>(a: T, b: T) => +new Date(b.createdAt) - +new Date(a.createdAt);

export const documents = {
  async list(): Promise<Document[]> {
    await delay();
    return [...db.documents].sort(byNewest);
  },

  async get(id: string): Promise<Document> {
    await delay(150);
    const doc = db.documents.find((d) => d.id === id);
    if (!doc) throw new NotFoundError('document');
    return doc;
  },

  /**
   * Mock upload. `onStep` reports 0–3 for the active processing step and 4 when done:
   * reading → structure → key concepts → preparing study material.
   * With the real backend, poll a document status endpoint and call onStep from it.
   */
  async upload(file: File, onStep: (step: number) => void): Promise<Document> {
    for (let step = 0; step < 4; step++) {
      onStep(step);
      await delay(step === 2 ? 1700 : 1100);
    }
    const pages = Math.max(6, Math.round((file.size / 1024 / 1024) * 11));
    const id = uid('doc');
    const names = ['Introduction', 'Core concepts', 'Key definitions', 'Methods and techniques', 'Worked examples', 'Applications'];
    const doc: Document = {
      id,
      title: titleFromFileName(file.name),
      fileName: file.name,
      sizeBytes: file.size,
      pages,
      conceptCount: 8 + (pages % 11),
      createdAt: new Date().toISOString(),
      folderId: null,
      topics: names.map((name, i) => ({ id: `${id}-t${i}`, name, documentId: id })),
    };
    db.documents = [doc, ...db.documents];
    notify();
    onStep(4);
    return doc;
  },

  async rename(id: string, title: string): Promise<void> {
    await delay(150);
    db.documents = db.documents.map((d) => (d.id === id ? { ...d, title } : d));
    notify();
  },

  /** Deleting a document also deletes everything generated from it. */
  async remove(id: string): Promise<void> {
    await delay(200);
    const quizIds = db.quizzes.filter((q) => q.documentId === id).map((q) => q.id);
    db.documents = db.documents.filter((d) => d.id !== id);
    db.quizzes = db.quizzes.filter((q) => q.documentId !== id);
    db.attempts = db.attempts.filter((a) => !quizIds.includes(a.quizId));
    db.summaries = db.summaries.filter((s) => s.documentId !== id);
    notify();
  },
};
