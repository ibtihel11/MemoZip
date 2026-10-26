import { tokenStorage, type TokenResponse } from './tokenStorage';

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

let refreshPromise: Promise<TokenResponse | null> | null = null;

async function refreshTokens(): Promise<TokenResponse | null> {
  if (refreshPromise) return refreshPromise;

  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return null;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) throw new Error('Token refresh failed');

      const tokens = (await res.json()) as TokenResponse;

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Invalid token response');
      }

      tokenStorage.saveTokens(tokens);
      return tokens;
    } catch {
      tokenStorage.clearTokens();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function sendRequest(path: string, init: RequestInit, accessToken?: string,): Promise<Response> {
  const headers = new Headers(init.headers);
  const isFormData = init.body instanceof FormData;

  if (!isFormData && init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = accessToken ?? tokenStorage.getAccessToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });
}

export async function http<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let res = await sendRequest(path, init);

  const excludedPaths = [
    '/auth/login',
    '/auth/refresh',
    '/auth/register',
    '/auth/logout',
  ];

  if (
    res.status === 401 &&
    !excludedPaths.includes(path.split('?')[0]) &&
    tokenStorage.getRefreshToken()
  ) {
    const tokens = await refreshTokens();

    if (tokens) {
      res = await sendRequest(path, init, tokens.access_token);
    }
  }

  if (!res.ok) {
    const detail = await res.json().catch(() => null);

    throw new ApiError(
      detail?.detail ?? 'Something went wrong. Please try again.',
      res.status,
    );
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const delay = (ms = 250) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
