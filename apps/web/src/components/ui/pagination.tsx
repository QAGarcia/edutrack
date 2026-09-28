import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

export function Pagination({ page, totalPages, total, onChange }: { page: number; totalPages: number; total: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-4 pt-6">
      <p className="text-sm text-slate-500">
        Página <strong className="text-slate-700">{page}</strong> de <strong className="text-slate-700">{totalPages}</strong> · {total} resultados
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft className="size-4" aria-hidden /> Anterior
        </Button>
        <Button variant="outline" size="sm" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
          Próxima <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
