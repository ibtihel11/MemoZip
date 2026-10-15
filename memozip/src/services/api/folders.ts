import { db, notify } from '@/data/db';
import type { Folder } from '@/types';
import { uid } from '@/utils/id';
import { delay, NotFoundError } from './http';

const countItems = (folderId: string) =>
  db.documents.filter((d) => d.folderId === folderId).length +
  db.quizzes.filter((q) => q.saved && q.folderId === folderId).length +
  db.summaries.filter((s) => s.saved && s.folderId === folderId).length;

export const folders = {
  async list(): Promise<Folder[]> {
    await delay(150);
    return db.folders.map((f) => ({ ...f, itemCount: countItems(f.id) }));
  },

  async get(id: string): Promise<Folder> {
    await delay(150);
    const f = db.folders.find((x) => x.id === id);
    if (!f) throw new NotFoundError('folder');
    return { ...f, itemCount: countItems(id) };
  },

  async create(name: string): Promise<Folder> {
    await delay(200);
    const folder: Folder = { id: uid('f'), name: name.trim(), createdAt: new Date().toISOString() };
    db.folders = [...db.folders, folder];
    notify();
    return folder;
  },

  async rename(id: string, name: string): Promise<void> {
    await delay(150);
    db.folders = db.folders.map((f) => (f.id === id ? { ...f, name: name.trim() } : f));
    notify();
  },

  /** Deleting a folder never deletes its contents; they simply become unfiled. */
  async remove(id: string): Promise<void> {
    await delay(200);
    db.folders = db.folders.filter((f) => f.id !== id);
    db.documents = db.documents.map((d) => (d.folderId === id ? { ...d, folderId: null } : d));
    db.quizzes = db.quizzes.map((q) => (q.folderId === id ? { ...q, folderId: null } : q));
    db.summaries = db.summaries.map((s) => (s.folderId === id ? { ...s, folderId: null } : s));
    notify();
  },
};
