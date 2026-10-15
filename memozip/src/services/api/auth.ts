import { db, notify } from '@/data/db';
import type { User } from '@/types';
import { delay } from './http';

const LOGGED_OUT_KEY = 'memozip-logged-out';

export const auth = {
  /** Mock: the demo user is signed in until they log out. */
  async getCurrentUser(): Promise<User | null> {
    await delay(120);
    return localStorage.getItem(LOGGED_OUT_KEY) ? null : { ...db.user };
  },
  async login(email: string, _password: string): Promise<User> {
    await delay(500);
    localStorage.removeItem(LOGGED_OUT_KEY);
    db.user = { ...db.user, email: email || db.user.email };
    return { ...db.user };
  },
  async register(name: string, email: string, _password: string): Promise<User> {
    await delay(600);
    localStorage.removeItem(LOGGED_OUT_KEY);
    db.user = { ...db.user, name: name || db.user.name, email: email || db.user.email };
    return { ...db.user };
  },
  async logout(): Promise<void> {
    await delay(100);
    localStorage.setItem(LOGGED_OUT_KEY, '1');
  },
  async updateUser(patch: Partial<Omit<User, 'id'>>): Promise<User> {
    await delay(300);
    db.user = { ...db.user, ...patch };
    notify();
    return { ...db.user };
  },
};
