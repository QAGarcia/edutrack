import { cn } from '../../lib/cn';

export function ProgressBar({ value, label, className, tone = 'brand' }: { value: number; label: string; className?: string; tone?: 'brand' | 'success' }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-100', className)}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-500', tone === 'success' ? 'bg-emerald-500' : 'bg-brand-500')}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}
