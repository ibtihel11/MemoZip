import { seed, type MockDb } from './mockData';

/**
 * In-memory store that stands in for the backend database.
 * Services replace arrays immutably and call notify(), so useQuery refetches.
 * Delete this file when the FastAPI backend is connected.
 */
export const db: MockDb = JSON.parse(JSON.stringify(seed));

const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notify(): void {
  listeners.forEach((l) => l());
}
