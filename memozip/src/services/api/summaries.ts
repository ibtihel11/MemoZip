import type { Summary } from '@/types';
import { notify } from '../invalidate';
import { http } from './http';
import { mapSummary } from './mappers';

async function getSummary(id: string): Promise<Summary> {
  return mapSummary(await http(`/library/summaries/${id}`));
}

/** Generation endpoints may answer with just the id; load the full summary in that case. */
async function complete(raw: unknown): Promise<Summary> {
  const summary = mapSummary(raw);
  return summary.overview || summary.concepts.length > 0 ? summary : getSummary(summary.id);
}

export const summaries = {
  get: getSummary,

  async generate(documentId: string): Promise<Summary> {
    const summary = await complete(await http(`/documents/${documentId}/summary`, { method: 'POST', timeoutMs: 120_000 }));
    notify();
    return summary;
  },

  async regenerate(id: string): Promise<Summary> {
    const summary = await complete(await http(`/documents/summaries/${id}/regenerate`, { method: 'POST' }));
    notify();
    return summary;
  },

  async save(id: string): Promise<void> {
    await http(`/documents/summaries/${id}/save`, { method: 'PATCH', json: { isSaved: true } });
    notify();
  },

  async rename(id: string, title: string): Promise<void> {
    await http(`/documents/summaries/${id}`, { method: 'PATCH', json: { title } });
    notify();
  },

  async remove(id: string): Promise<void> {
    await http(`/documents/summaries/${id}`, { method: 'DELETE' });
    notify();
  },
};
