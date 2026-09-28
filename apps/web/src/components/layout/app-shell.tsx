import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { ChevronDown, GraduationCap, LogOut, Menu, UserRound, X } from 'lucide-react';
import { useAuth } from '../../auth/auth-context';
import { cn } from '../../lib/cn';
import { ROLE_LABEL } from '../../lib/format';
import type { Role } from '../../lib/types';
import { ButtonLink } from '../ui/button';
import { Spinner } from '../ui/feedback';
import { Avatar, Container } from '../ui/misc';

const NAV: { to: string; label: string; roles?: Role[]; end?: boolean }[] = [
  { to: '/cursos', label: 'Cursos' },
  { to: '/meu-aprendizado', label: 'Meu aprendizado', roles: ['STUDENT'] },
  { to: '/professor', label: 'Painel do professor', roles: ['TEACHER'], end: true },
  { to: '/professor/cursos', label: 'Meus cursos', roles: ['TEACHER'] },
  { to: '/admin', label: 'Visão geral', roles: ['ADMIN'], end: true },
  { to: '/admin/cursos', label: 'Cursos (admin)', roles: ['ADMIN'] },
  { to: '/admin/usuarios', label: 'Usuários', roles: ['ADMIN'] },
  { to: '/verificar-certificado', label: 'Verificar certificado' },
];

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-bold tracking-tight text-slate-900" aria-label="EduTrack — página inicial">
      <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white shadow-sm">
        <GraduationCap className="size-5" aria-hidden />
      </span>
      <span className="text-lg">Edu<span className="text-brand-600">Track</span></span>
    </Link>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (!user) return null;
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu do usuário"
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-slate-100"
      >
        <Avatar name={user.name} size="sm" />
        <span className="hidden text-left text-sm leading-tight md:block">
          <span className="block font-medium text-slate-800" data-testid="user-name">{user.name}</span>
          <span className="block text-xs text-slate-500">{ROLE_LABEL[user.role]}</span>
        </span>
        <ChevronDown className="size-4 text-slate-400" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="animate-fade-in absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lift">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <button role="menuitem" onClick={() => { setOpen(false); navigate('/perfil'); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            <UserRound className="size-4" aria-hidden /> Meu perfil
          </button>
          <button role="menuitem" onClick={() => { setOpen(false); logout(); navigate('/'); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50">
            <LogOut className="size-4" aria-hidden /> Sair
          </button>
        </div>
      )}
    </div>
  );
}

export function AppShell() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setMobileOpen(false), [location.pathname]);

  const links = NAV.filter((n) => !n.roles || (user && n.roles.includes(user.role)));
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn('rounded-lg px-3 py-2 text-sm font-medium transition', isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900');

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lift">
        Pular para o conteúdo
      </a>
      <header className="no-print sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <Container className="flex h-16 items-center gap-6">
          <Logo />
          <nav aria-label="Principal" className="hidden flex-1 items-center gap-1 lg:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>{l.label}</NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <UserMenu />
            ) : (
              <>
                <ButtonLink to="/entrar" variant="ghost" size="sm">Entrar</ButtonLink>
                <ButtonLink to="/cadastro" size="sm">Criar conta</ButtonLink>
              </>
            )}
            <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen((o) => !o)} aria-label="Abrir menu" aria-expanded={mobileOpen}>
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </Container>
        {mobileOpen && (
          <nav aria-label="Menu móvel" className="border-t border-slate-200 bg-white lg:hidden">
            <Container className="flex flex-col gap-1 py-3">
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>{l.label}</NavLink>
              ))}
            </Container>
          </nav>
        )}
      </header>

      <main id="conteudo" className="flex-1">
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="no-print border-t border-slate-200 bg-white">
        <Container className="flex flex-col items-center justify-between gap-3 py-8 text-sm text-slate-500 sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} EduTrack · Plataforma de estudo para automação de testes.</p>
          <div className="flex gap-4">
            <a href="/docs" className="hover:text-slate-800">API</a>
            <Link to="/verificar-certificado" className="hover:text-slate-800">Certificados</Link>
          </div>
        </Container>
      </footer>
    </div>
  );
}
