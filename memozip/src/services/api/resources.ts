import type { Resource, ResourceType } from '@/types';
import { http } from './http';
import { documents } from './documents';
import { quizzes } from './quizzes';
import { summaries } from './summaries';

interface ApiResource {
  id: string;
  type: ResourceType;
  title: string;
  document_id?: string;
  document_title?: string | null;
  folder_id?: string | null;
  created_at: string;
  status?: string;
  question_count?: number;
  last_score?: number | null;
}

interface ApiLibraryResponse {
  total_items: number;
  items: ApiResource[];
}

function mapResource(item: ApiResource): Resource {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    documentId: item.document_id ?? item.id,
    sourceTitle: item.document_title ?? undefined,
    folderId: item.folder_id ?? null,
    date: item.created_at,
    score: item.last_score ?? undefined,
    questionCount: item.question_count,
  };
}

export const resources = {
  async list(
    filter: {
      type?: ResourceType;
      folderId?: string;
      query?: string;
    } = {},
  ): Promise<Resource[]> {
    const params = new URLSearchParams();

    if (filter.type) params.set('type', filter.type);
    if (filter.folderId) params.set('folderId', filter.folderId);
    if (filter.query?.trim()) params.set('q', filter.query.trim());

    const query = params.toString();
    const endpoint = query ? `/library?${query}` : '/library';
    const response = await http<ApiLibraryResponse>(endpoint);

    return response.items.map(mapResource);
  },

  async get(type: ResourceType, id: string): Promise<Resource> {
    const response = await http<ApiLibraryResponse>(
      `/library?type=${type}`,
    );
    const item = response.items.find((resource) => resource.id === id);

    if (!item) throw new Error(`${type} not found`);

    return mapResource(item);
  },

  rename(
    resource: Pick<Resource, 'type' | 'id'>,
    title: string,
  ): Promise<void> {
    if (resource.type === 'document') {
      return documents.rename(resource.id, title);
    }

    if (resource.type === 'quiz') {
      return quizzes.rename(resource.id, title);
    }

    return summaries.rename(resource.id, title);
  },

  remove(resource: Pick<Resource, 'type' | 'id'>): Promise<void> {
    if (resource.type === 'document') {
      return documents.remove(resource.id);
    }

    if (resource.type === 'quiz') {
      return quizzes.remove(resource.id);
    }

    return summaries.remove(resource.id);
  },

  async move(
    resource: Pick<Resource, 'type' | 'id'>,
    folderId: string | null,
  ): Promise<void> {
    if (resource.type === 'document') {
      throw new Error('Uploaded documents cannot be moved into saved-material folders.');
    }

    const endpoint =
      resource.type === 'quiz'
        ? `/library/quizzes/${resource.id}/folder`
        : `/library/summaries/${resource.id}/folder`;

    await http(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({ folder_id: folderId }),
    });
  },
};