import type { Resource, ResourceType } from '@/types';
import { formatRelative } from './format';

export const typeLabel: Record<ResourceType, string> = {
  document: 'Document',
  quiz: 'Quiz',
  summary: 'Summary',
};

export function resourcePath(r: Pick<Resource, 'type' | 'id'>): string {
  switch (r.type) {
    case 'document': return `/documents/${r.id}`;
    case 'quiz': return `/quizzes/${r.id}`;
    case 'summary': return `/summaries/${r.id}`;
  }
}

/** Third line of a resource card: score, page count and date. */
export function resourceMeta(r: Resource): string {
  if (r.type === 'document') return `${r.pages ? `${r.pages} pages · ` : ''}Uploaded ${formatRelative(r.date)}`;
  if (r.type === 'summary') return `Saved ${formatRelative(r.date)}`;
  if (r.score !== undefined && r.lastAttemptAt) return `${r.score}% · Last attempted ${formatRelative(r.lastAttemptAt)}`;
  return `${r.questionCount ?? 0} questions · Saved ${formatRelative(r.date)}`;
}
