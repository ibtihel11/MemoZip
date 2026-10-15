import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/services/api';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<Omit<User, 'id'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth.getCurrentUser().then(setUser).finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => setUser(await api.auth.login(email, password)), []);
  const register = useCallback(async (name: string, email: string, password: string) => setUser(await api.auth.register(name, email, password)), []);
  const logout = useCallback(async () => {
    await api.auth.logout();
    setUser(null);
  }, []);
  const updateUser = useCallback(async (patch: Partial<Omit<User, 'id'>>) => setUser(await api.auth.updateUser(patch)), []);

  const value = useMemo(() => ({ user, loading, login, register, logout, updateUser }), [user, loading, login, register, logout, updateUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** For pages behind ProtectedRoute, where a user always exists. */
export function useUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error('useUser called without a signed-in user');
  return user;
}
