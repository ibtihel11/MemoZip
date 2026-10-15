/**
 * Single place for talking to the FastAPI backend.
 * While USE_MOCK is true, the service modules answer from src/data instead.
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';
export const USE_MOCK: boolean = (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false';

export class ApiError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NotFoundError extends ApiError {
  constructor(what: string) {
    super(`We couldn't find that ${what}. It may have been deleted.`, 404);
  }
}

export async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: init.body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new ApiError(detail?.detail ?? 'Something went wrong. Please try again.', res.status);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/** Simulates network latency for the mock layer. */
export const delay = (ms = 250) => new Promise<void>((resolve) => setTimeout(resolve, ms));
