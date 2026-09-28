import type { CourseLevel, CourseStatus, Role, Situation } from './types';

export const LEVEL_LABEL: Record<CourseLevel, string> = {
  BEGINNER: 'Iniciante',
  INTERMEDIATE: 'Intermediário',
  ADVANCED: 'Avançado',
};

export const STATUS_LABEL: Record<CourseStatus, string> = {
  DRAFT: 'Rascunho',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Arquivado',
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrador',
  TEACHER: 'Professor',
  STUDENT: 'Aluno',
};

export const SITUATION_LABEL: Record<Situation, string> = {
  IN_PROGRESS: 'Em andamento',
  APPROVED: 'Aprovado',
  FAILED: 'Reprovado',
  CANCELLED: 'Cancelado',
};

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
const longDateFmt = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
const gradeFmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatLongDate = (iso: string) => longDateFmt.format(new Date(iso));
export const formatGrade = (n: number | null | undefined) => (n === null || n === undefined ? '—' : gradeFmt.format(n));

export function formatMinutes(total: number) {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

export const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');

export const HOME_BY_ROLE: Record<Role, string> = {
  STUDENT: '/meu-aprendizado',
  TEACHER: '/professor',
  ADMIN: '/admin',
};
