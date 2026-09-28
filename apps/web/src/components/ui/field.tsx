import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

const control =
  'block w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm transition ' +
  'placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-100 ' +
  'disabled:bg-slate-50 disabled:text-slate-500';

const stateClass = (error?: string) => (error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-300');

interface FieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
  className?: string;
}

/** Envolve um controle com label, dica e erro — tudo ligado por id/aria (acessível e fácil de localizar em testes). */
export function Field({ label, error, hint, children, className }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children({ id, describedBy, invalid: !!error })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type WithError = { error?: string };

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & WithError>(
  ({ className, error, ...props }, ref) => (
    <input ref={ref} className={cn(control, 'h-10', stateClass(error), className)} aria-invalid={!!error || undefined} {...props} />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & WithError>(
  ({ className, error, ...props }, ref) => (
    <textarea ref={ref} className={cn(control, 'py-2', stateClass(error), className)} aria-invalid={!!error || undefined} {...props} />
  ),
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & WithError>(
  ({ className, error, ...props }, ref) => (
    <select ref={ref} className={cn(control, 'h-10 pr-8', stateClass(error), className)} aria-invalid={!!error || undefined} {...props} />
  ),
);
Select.displayName = 'Select';
