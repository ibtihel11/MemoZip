import type { Difficulty, User } from '@/types';
import { notify } from '../invalidate';
import { ApiError, captureTokens, clearTokens, getRefreshToken, http } from './http';
import { mapUser } from './mappers';

/**
 * Quiz defaults are kept in the browser: they only pre-fill the quiz setup screen. If the backend
 * adds PATCH /auth/me they are sent there too (see updateUser).
 */
const PREFS_KEY = 'memozip-prefs';
interface Prefs {
  defaultDifficulty?: Difficulty;
  defaultQuestionCount?: number;
}

function readPrefs(): Prefs {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Prefs;
  } catch {
    return {};
  }
}

function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...readPrefs(), ...prefs }));
  } catch {
    /* storage unavailable */
  }
}

async function me(): Promise<User> {
  return mapUser(await http('/auth/me'), readPrefs());
}

async function login(email: string, password: string): Promise<User> {
  captureTokens(await http('/auth/login', { method: 'POST', json: { email, password } }));
  return me();
}

export const auth = {
  /** Restores the session on page load. Resolves to null when signed out. */
  async getCurrentUser(): Promise<User | null> {
    try {
      return await me();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null;
      throw e;
    }
  },

  login,

  async register(name: string, email: string, password: string): Promise<User> {
    captureTokens(await http('/auth/register', { method: 'POST', json: { name, email, password } }));
    try {
      return await me();
    } catch (e) {
      // The backend created the account but did not start a session.
      if (e instanceof ApiError && e.status === 401) return login(email, password);
      throw e;
    }
  },

  async logout(): Promise<void> {
    const refreshToken = getRefreshToken();
    try {
      await http('/auth/logout', { method: 'POST', json: refreshToken ? { refreshToken } : undefined });
    } catch {
      /* signing out locally is enough */
    } finally {
      clearTokens();
    }
  },

  async updateUser(patch: Partial<Omit<User, 'id'>>): Promise<User> {
    const { defaultDifficulty, defaultQuestionCount, ...profile } = patch;
    try {
      await http('/auth/me', { method: 'PATCH', json: patch });
    } catch (e) {
      if (!(e instanceof ApiError) || (e.status !== 404 && e.status !== 405)) throw e;
      // The backend has no PATCH /auth/me yet: preferences still work locally, profile edits cannot.
      if (Object.keys(profile).length > 0) throw new ApiError("Changing your name or email isn't available yet.", 501);
    }
    savePrefs({
      ...(defaultDifficulty ? { defaultDifficulty } : {}),
      ...(defaultQuestionCount ? { defaultQuestionCount } : {}),
    });
    notify();
    return me();
  },
};
