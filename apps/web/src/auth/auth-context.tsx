import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, sessionStore, setUnauthorizedHandler } from '../lib/api';
import type { Role, Session, User } from '../lib/types';

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { name: string; email: string; password: string; role: 'STUDENT' | 'TEACHER' }) => Promise<User>;
  logout: (reason?: 'expired') => void;
  updateUser: (user: User) => void;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => sessionStore.read());
  const qc = useQueryClient();

  const persist = useCallback((s: Session | null) => {
    sessionStore.write(s);
    setSession(s);
  }, []);

  const logout = useCallback(
    (reason?: 'expired') => {
      persist(null);
      qc.clear();
      if (reason === 'expired') window.location.assign('/entrar?sessao=expirada');
    },
    [persist, qc],
  );

  useEffect(() => setUnauthorizedHandler(() => logout('expired')), [logout]);

  // Revalida a sessão ao abrir o app (usuário pode ter sido desativado ou token expirado).
  useEffect(() => {
    if (!session) return;
    api.auth.me().then((user) => persist({ ...session, user })).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      login: async (email, password) => {
        const s = await api.auth.login(email, password);
        persist(s);
        return s.user;
      },
      register: async (data) => {
        const s = await api.auth.register(data);
        persist(s);
        return s.user;
      },
      logout,
      updateUser: (user) => session && persist({ ...session, user }),
      hasRole: (...roles) => !!session && roles.includes(session.user.role),
    }),
    [session, persist, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
