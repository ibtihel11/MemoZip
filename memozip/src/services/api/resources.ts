import type { Resource, ResourceType } from '@/types';
import { notify } from '../invalidate';
import { documents } from './documents';
import { http } from './http';
import { listOf, mapFolderContents, mapResource } from './mappers';
import { quizzes } from './quizzes';
import { summaries } from './summaries';

type Ref = Pick<Resource, 'type' | 'id'>;

const byNewest = (a: Resource, b: Resource) => +new Date(b.date) - +new Date(a.date);

export const resources = {
  async list(filter: { type?: ResourceType; folderId?: string; query?: string } = {}): Promise<Resource[]> {
    const { type, folderId } = filter;
    const q = filter.query?.trim();

    // A folder on its own: GET /folders/{id} returns its documents, quizzes and summaries
    // (GET /library leaves documents out when a folder filter is set).
    if (folderId && !type && !q) {
      return mapFolderContents(await http(`/folders/${folderId}`), folderId).sort(byNewest);
    }

    // GET /api/library declares these query names (note the camelCase alias for folderId).
    const raw = await http('/library', { query: { type, q, folderId } });
    return listOf(raw).map((r) => mapResource(r)).sort(byNewest);
  },

  /** One item as a Resource (used for the actions menu on the course, quiz and summary pages). */
  async get(type: ResourceType, id: string): Promise<Resource> {
    if (type === 'document') {
      const d = await documents.get(id);
      return { id: d.id, type, title: d.title, documentId: d.id, folderId: d.folderId, date: d.createdAt, pages: d.pages };
    }
    if (type === 'quiz') {
      const q = await quizzes.get(id);
      return { id: q.id, type, title: q.title, documentId: q.documentId, folderId: q.folderId, date: q.createdAt, questionCount: q.questions.length };
    }
    const s = await summaries.get(id);
    return { id: s.id, type, title: s.title, documentId: s.documentId, folderId: s.folderId, date: s.createdAt };
  },

  rename(r: Ref, title: string): Promise<void> {
    return r.type === 'document' ? documents.rename(r.id, title) : r.type === 'quiz' ? quizzes.rename(r.id, title) : summaries.rename(r.id, title);
  },

  remove(r: Ref): Promise<void> {
    return r.type === 'document' ? documents.remove(r.id) : r.type === 'quiz' ? quizzes.remove(r.id) : summaries.remove(r.id);
  },

  /** Moves an item into a folder (null = unfiled). */
  async move(r: Ref, folderId: string | null): Promise<void> {
    if (r.type === 'document') await http(`/documents/${r.id}`, { method: 'PATCH', json: { folderId } });
    else if (r.type === 'quiz') await http(`/library/quizzes/${r.id}/folder`, { method: 'PATCH', json: { folderId } });
    else await http(`/library/summaries/${r.id}/folder`, { method: 'PATCH', json: { folderId } });
    notify();
  },
};
