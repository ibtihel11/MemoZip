import type { User } from '@/types';
import { API_BASE_URL, ApiError, http } from './http';
import { tokenStorage, type TokenResponse } from './tokenStorage';

interface UserResponse {
  id: string;
  name: string;
  email: string;
}

async function loginWithTokens(
  email: string,
  password: string,
): Promise<User> {
  const body = new URLSearchParams({
    username: email,
    password,
  });

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new ApiError(
      detail?.detail ?? 'Login failed. Please try again.',
      response.status,
    );
  }

  const tokens = (await response.json()) as TokenResponse;
  tokenStorage.saveTokens(tokens);

  return http<UserResponse>('/auth/me') as Promise<User>;
}

export const auth = {
  async getCurrentUser(): Promise<User | null> {
    if (!tokenStorage.getAccessToken()) {
      return null;
    }

    try {
      return await http<User>('/auth/me');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        tokenStorage.clearTokens();
        return null;
      }

      throw error;
    }
  },

  async login(email: string, password: string): Promise<User> {
    return loginWithTokens(email, password);
  },

  async register(
    name: string,
    email: string,
    password: string,
  ): Promise<User> {
    await http<UserResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    return loginWithTokens(email, password);
  },

  async logout(): Promise<void> {
    const refreshToken = tokenStorage.getRefreshToken();

    try {
      if (refreshToken) {
        await http<void>('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      }
    } finally {
      tokenStorage.clearTokens();
    }
  },

  async updateUser(_patch: Partial<Omit<User, 'id'>>): Promise<User> {
    throw new ApiError(
      'Profile updates are not supported by the backend yet.',
      501,
    );
  },
};
