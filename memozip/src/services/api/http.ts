/**
 * The only module that talks to the FastAPI backend over the network.
 *
 *  - Base URL: VITE_API_URL, default "/api" (the Vite dev server proxies it to the backend, so
 *    cookies are same-origin and no CORS setup is needed during development).
 *  - Keys: responses are camelized, JSON request bodies are snake_cased.
 *  - Session: works with HttpOnly cookies, and also with JSON tokens (access_token /
 *    refresh_token in the login response), which are then sent as a Bearer header.
 *  - An expired session (401) triggers one silent POST /auth/refresh and a retry.
 */
import { camelizeKeys, snakeizeKeys } from '@/utils/case';

export const API_BASE_URL: string = import.meta.env.VITE_API_URL || '/api';
export const UNAUTHORIZED_EVENT = 'memozip:unauthorized';

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

// ---------------------------------------------------------------- tokens (optional)
const TOKEN_KEY = 'memozip-auth';
interface Tokens {
  access?: string;
  refresh?: string;
}

function readTokens(): Tokens {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY) ?? '{}') as Tokens;
  } catch {
    return {};
  }
}

export const getRefreshToken = (): string | undefined => readTokens().refresh;

export function clearTokens(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Call with an (already camelized) auth response. Does nothing when the backend uses cookies. */
export function captureTokens(data: unknown): void {
  if (!data || typeof data !== 'object') return;
  const d = data as Record<string, unknown>;
  const access = typeof d.accessToken === 'string' ? d.accessToken : typeof d.token === 'string' ? d.token : undefined;
  const refresh = typeof d.refreshToken === 'string' ? d.refreshToken : undefined;
  if (!access && !refresh) return;
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ ...readTokens(), ...(access ? { access } : {}), ...(refresh ? { refresh } : {}) }));
  } catch {
    /* storage unavailable */
  }
}

// ---------------------------------------------------------------- requests
type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** JSON body. Keys are converted to snake_case. */
  json?: unknown;
  /** Multipart body (file upload). */
  form?: FormData;
  query?: Record<string, QueryValue>;
}

const NO_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const qs = params.toString();
  return `${API_BASE_URL}${path}${qs ? `?${qs}` : ''}`;
}

function send(path: string, { json, form, query, ...init }: RequestOptions): Promise<Response> {
  const headers = new Headers(init.headers);
  if (json !== undefined) headers.set('Content-Type', 'application/json');
  const access = readTokens().access;
  if (access) headers.set('Authorization', `Bearer ${access}`);
  return fetch(buildUrl(path, query), {
    ...init,
    headers,
    credentials: 'include',
    body: form ?? (json !== undefined ? JSON.stringify(snakeizeKeys(json)) : undefined),
  });
}

let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const refresh = getRefreshToken();
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: refresh ? JSON.stringify({ refresh_token: refresh }) : undefined,
      });
      if (!res.ok) return false;
      captureTokens(camelizeKeys(await res.json().catch(() => null)));
      return true;
    } catch {
      return false;
    }
  })();
  const ok = await refreshing;
  refreshing = null;
  return ok;
}

async function errorMessage(res: Response): Promise<string> {
  const fallback = 'Something went wrong. Please try again.';
  try {
    const body = (await res.json()) as { detail?: unknown };
    if (typeof body.detail === 'string') return body.detail;
    if (Array.isArray(body.detail)) {
      // FastAPI validation errors: [{ loc, msg, type }]
      const msg = (body.detail[0] as { msg?: string } | undefined)?.msg;
      return msg ? msg.replace(/^Value error, /, '') : fallback;
    }
  } catch {
    /* not JSON */
  }
  return fallback;
}

const NETWORK_ERROR = "We can't reach MemoZip right now. Check your connection and try again.";

export async function http<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await send(path, options);
  } catch {
    throw new ApiError(NETWORK_ERROR, 0);
  }

  if (res.status === 401 && !NO_REFRESH.includes(path)) {
    if (await refreshSession()) {
      try {
        res = await send(path, options);
      } catch {
        throw new ApiError(NETWORK_ERROR, 0);
      }
    }
    if (res.status === 401) {
      clearTokens();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
  }

  if (!res.ok) throw new ApiError(await errorMessage(res), res.status);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? camelizeKeys(JSON.parse(text)) : undefined) as T;
}
