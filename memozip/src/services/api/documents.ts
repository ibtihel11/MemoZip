import type { Document } from '@/types';
import { notify } from '../invalidate';
import { ApiError, http } from './http';
import { listOf, mapDocument } from './mappers';

const POLL_MS = 1200;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function fetchDocument(id: string): Promise<{ doc: Document; hasTopics: boolean }> {
  const raw = await http<any>(`/documents/${id}`); // eslint-disable-line @typescript-eslint/no-explicit-any
  return { doc: mapDocument(raw), hasTopics: Array.isArray(raw?.topics) };
}

/** Polls GET /documents/{id} while the backend processes the file (reports the active step). */
async function waitUntilReady(doc: Document, onStep: (step: number) => void): Promise<Document> {
  const startedAt = Date.now();
  let current = doc;
  while (current.status === 'processing' || current.status === 'uploaded') {
    if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
      throw new ApiError('Analyzing this document is taking longer than expected. Check your library in a moment.', 504);
    }
    onStep(Math.min(3, Math.max(0, current.processingStep ?? 0)));
    await sleep(POLL_MS);
    current = (await fetchDocument(current.id)).doc;
  }
  if (current.status === 'failed') throw new ApiError(current.errorMessage || 'We couldn’t process this PDF.', 422);
  return current;
}

export const documents = {
  async list(): Promise<Document[]> {
    return listOf(await http('/documents')).map(mapDocument);
  },

  async get(id: string): Promise<Document> {
    return (await fetchDocument(id)).doc;
  },

  /**
   * Uploads a PDF and resolves once it is ready. `onStep` reports 0-3 for the active step and 4 when
   * done. While the upload request itself is running (the backend may process synchronously) the
   * first steps are animated locally; afterwards the backend's own processing_step is used.
   */
  async upload(file: File, onStep: (step: number) => void): Promise<Document> {
    const form = new FormData();
    form.append('file', file);

    let tick = 0;
    onStep(0);
    const ticker = window.setInterval(() => onStep(Math.min(2, ++tick)), 1800);
    let created: Document;
    try {
      created = mapDocument(await http('/documents/upload', { method: 'POST', form }));
    } finally {
      window.clearInterval(ticker);
    }

    await waitUntilReady(created, onStep);
    const detail = await fetchDocument(created.id);
    let doc = detail.doc;

    // If the backend exposes topics on the document but none exist yet, ask it to extract them.
    if (detail.hasTopics && doc.topics.length === 0) {
      try {
        await http(`/documents/${doc.id}/topics`, { method: 'POST' });
        doc = (await fetchDocument(doc.id)).doc;
      } catch {
        /* topics are a bonus; the course is usable without them */
      }
    }
    notify();
    onStep(4);
    return doc;
  },

  /** Re-runs processing for a document whose status is "failed". */
  async retry(id: string, onStep: (step: number) => void = () => undefined): Promise<Document> {
    const started = mapDocument(await http(`/documents/${id}/retry`, { method: 'POST' }));
    notify();
    const doc = await waitUntilReady(started, onStep);
    notify();
    return doc;
  },

  async rename(id: string, title: string): Promise<void> {
    await http(`/documents/${id}`, { method: 'PATCH', json: { title } });
    notify();
  },

  async remove(id: string): Promise<void> {
    await http(`/documents/${id}`, { method: 'DELETE' });
    notify();
  },
};
