import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}

/** Modal acessível: role="dialog", foco inicial, Esc fecha, clique fora fecha, foco retorna ao gatilho. */
export function Dialog({ open, onClose, title, description, children, footer }: DialogProps) {
  const titleId = useId();
  const descId = useId();
  const panel = useRef<HTMLDivElement>(null);

  // onClose pode mudar a cada render do pai; guardamos a versão mais recente numa ref
  // para que o efeito abaixo rode só ao abrir/fechar (senão o foco "pula" durante a digitação).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = panel.current?.querySelector<HTMLElement>('input:not([disabled]), select, textarea, button:not([data-close])');
    (focusable ?? panel.current)?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className="animate-fade-in relative w-full max-w-md rounded-2xl bg-white shadow-lift"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-slate-900">{title}</h2>
            {description && <div id={descId} className="mt-1 text-sm text-slate-500">{description}</div>}
          </div>
          <button data-close onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>
        {children && <div className="px-6 pt-4">{children}</div>}
        {footer && <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 px-6 py-4">{footer}</div>}
        {!footer && <div className="h-6" />}
      </div>
    </div>
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, description, confirmLabel, tone = 'danger', loading, onConfirm, onClose }: ConfirmProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>Voltar</Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    />
  );
}
