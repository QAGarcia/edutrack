import { BookOpen, BrainCircuit, Briefcase, Code2, GraduationCap, HeartPulse, Languages, Palette, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import { LEVEL_LABEL, SITUATION_LABEL, STATUS_LABEL } from '../../lib/format';
import type { CourseLevel, CourseStatus, Situation } from '../../lib/types';
import { Badge, type Tone } from '../ui/badge';

const THEMES: Record<string, { gradient: string; icon: LucideIcon }> = {
  tecnologia: { gradient: 'from-indigo-500 via-violet-500 to-purple-600', icon: Code2 },
  'dados-e-ia': { gradient: 'from-sky-500 via-blue-500 to-indigo-600', icon: BrainCircuit },
  negocios: { gradient: 'from-emerald-500 via-teal-500 to-cyan-600', icon: Briefcase },
  educacao: { gradient: 'from-amber-400 via-orange-500 to-rose-500', icon: GraduationCap },
  linguagens: { gradient: 'from-rose-400 via-pink-500 to-fuchsia-600', icon: Languages },
  saude: { gradient: 'from-red-400 via-rose-500 to-pink-600', icon: HeartPulse },
  design: { gradient: 'from-fuchsia-500 via-purple-500 to-violet-600', icon: Palette },
};

export const themeOf = (slug: string) => THEMES[slug] ?? { gradient: 'from-slate-500 to-slate-700', icon: BookOpen };

export function CourseCover({ categorySlug, className, iconSize = 'size-10' }: { categorySlug: string; className?: string; iconSize?: string }) {
  const { gradient, icon: Icon } = themeOf(categorySlug);
  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br', gradient, className)} aria-hidden>
      <div className="absolute -right-6 -top-6 size-28 rounded-full bg-white/10" />
      <div className="absolute -bottom-10 left-6 size-32 rounded-full bg-white/10" />
      <div className="relative grid h-full place-items-center">
        <Icon className={cn('text-white/90 drop-shadow', iconSize)} strokeWidth={1.5} />
      </div>
    </div>
  );
}

const LEVEL_TONE: Record<CourseLevel, Tone> = { BEGINNER: 'success', INTERMEDIATE: 'info', ADVANCED: 'warning' };
const STATUS_TONE: Record<CourseStatus, Tone> = { DRAFT: 'warning', PUBLISHED: 'success', ARCHIVED: 'neutral' };
const SITUATION_TONE: Record<Situation, Tone> = { IN_PROGRESS: 'info', APPROVED: 'success', FAILED: 'danger', CANCELLED: 'neutral' };

export const LevelBadge = ({ level }: { level: CourseLevel }) => <Badge tone={LEVEL_TONE[level]}>{LEVEL_LABEL[level]}</Badge>;
export const StatusBadge = ({ status }: { status: CourseStatus }) => <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
export const SituationBadge = ({ situation }: { situation: Situation }) => (
  <Badge tone={SITUATION_TONE[situation]}>{SITUATION_LABEL[situation]}</Badge>
);
