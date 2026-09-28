import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { initials } from '../../lib/format';

const avatarColors = ['bg-brand-100 text-brand-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-800', 'bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700', 'bg-fuchsia-100 text-fuchsia-700'];

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const color = avatarColors[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % avatarColors.length];
  const s = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-lg' }[size];
  return (
    <span className={cn('inline-grid shrink-0 place-items-center rounded-full font-semibold', color, s)} aria-hidden>
      {initials(name)}
    </span>
  );
}

export function StatCard({ label, value, icon, hint, tone = 'brand' }: { label: string; value: ReactNode; icon: ReactNode; hint?: string; tone?: 'brand' | 'success' | 'warning' | 'info' }) {
  const tones = { brand: 'bg-brand-50 text-brand-600', success: 'bg-emerald-50 text-emerald-600', warning: 'bg-amber-50 text-amber-600', info: 'bg-sky-50 text-sky-600' };
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card" role="group" aria-label={label}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={cn('grid size-9 place-items-center rounded-xl', tones[tone])}>{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900" data-testid="stat-value">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>;
}
