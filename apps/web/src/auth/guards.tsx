import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { HOME_BY_ROLE } from '../lib/format';
import type { Role } from '../lib/types';
import { useAuth } from './auth-context';

/** Protege rotas: sem login → /entrar (guardando o destino); perfil errado → página 403. */
export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to={`/entrar?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/acesso-negado" replace />;
  return <>{children}</>;
}

/** Páginas de login/cadastro: se já logado, manda para a home do perfil. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  return <>{children}</>;
}
