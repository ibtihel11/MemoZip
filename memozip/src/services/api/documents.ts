import type { Document } from '@/types';
import { delay, http } from './http';

interface ApiTopic {
  id: string;
  name: string;
  position?: number;
}

interface ApiDocument {
  id: string;
  title: string;
  file_name: string;
  size_bytes?: number | null;
  page_count?: number | null;
  concept_count?: number | null;
  folder_id: string | null;
  created_at: string;
  status?: 'uploaded' | 'processing' | 'ready' | 'failed';
  processing_step?: number;
  error_message?: string | null;
  topics?: ApiTopic[];
}

function mapDocument(data: ApiDocument): Document {
  return {
    id: data.id,
    title: data.title,
    fileName: data.file_name,
    sizeBytes: data.size_bytes ?? 0,
    pages: data.page_count ?? 0,
    conceptCount: data.concept_count ?? 0,
    createdAt: data.created_at,
    folderId: data.folder_id,
    topics: (data.topics ?? []).map((topic) => ({
      id: topic.id,
      name: topic.name,
      documentId: data.id,
    })),
  };
}

export const documents = {
  async list(): Promise<Document[]> {
    const data = await http<ApiDocument[]>('/documents');
    return data.map(mapDocument);
  },

  async get(id: string): Promise<Document> {
    const data = await http<ApiDocument>(`/documents/${id}`);
    return mapDocument(data);
  },

  async upload(file: File, onStep: (step: number) => void): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    const uploaded = await http<ApiDocument>('/documents/upload', {
      method: 'POST',
      body: formData,
    });

    let current = uploaded;
    for (let attempt = 0; attempt < 120; attempt++) {
      if (current.status === 'failed') {
        throw new Error(
          current.error_message ?? 'Document processing failed.',
        );
      }

      if (current.status === 'ready') {
        onStep(4);
        return mapDocument(current);
      }

      const processingStep = current.processing_step ?? 0;
      onStep(Math.min(3, Math.max(0, processingStep - 1)));

      await delay(1000);
      current = await http<ApiDocument>(`/documents/${uploaded.id}`);
    }

    throw new Error('Document processing is taking too long. Please try again.');
  },

  async rename(id: string, title: string): Promise<void> {
    await http(`/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  },

  async remove(id: string): Promise<void> {
    await http(`/documents/${id}`, {
      method: 'DELETE',
    });
  },
};