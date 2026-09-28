import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search, SearchX } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { CourseCard } from '../../components/course/course-card';
import { Button } from '../../components/ui/button';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/feedback';
import { Input, Select } from '../../components/ui/field';
import { Container, PageHeader } from '../../components/ui/misc';
import { Pagination } from '../../components/ui/pagination';
import { api, errorMessage } from '../../lib/api';
import { LEVEL_LABEL } from '../../lib/format';

const PAGE_SIZE = 9;

/** Filtros vivem na URL: a página é compartilhável e o botão "voltar" funciona. */
export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get('busca') ?? '';
  const category = params.get('categoria') ?? '';
  const level = params.get('nivel') ?? '';
  const sort = params.get('ordem') ?? 'newest';
  const page = Number(params.get('pagina') ?? 1);
  const [term, setTerm] = useState(search);
  useEffect(() => setTerm(search), [search]);

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('pagina' in patch)) next.delete('pagina');
    setParams(next);
  };

  const categories = useQuery({ queryKey: ['categories'], queryFn: api.categories.list });
  const courses = useQuery({
    queryKey: ['courses', 'catalog', { search, category, level, sort, page }],
    queryFn: () => api.courses.list({ search, category, level, sort, page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const hasFilters = !!(search || category || level);

  return (
    <Container className="py-10">
      <PageHeader title="Catálogo de cursos" description="Encontre o próximo passo da sua carreira." />

      <form
        role="search"
        aria-label="Filtrar cursos"
        className="mb-8 grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card md:grid-cols-[1fr_200px_180px_180px_auto]"
        onSubmit={(e) => { e.preventDefault(); update({ busca: term.trim() }); }}
      >
        <div className="relative">
          <label htmlFor="busca" className="sr-only">Buscar cursos</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input id="busca" type="search" placeholder="Buscar por título ou assunto" className="pl-9" value={term} onChange={(e) => setTerm(e.target.value)} />
        </div>
        <div>
          <label htmlFor="categoria" className="sr-only">Categoria</label>
          <Select id="categoria" value={category} onChange={(e) => update({ categoria: e.target.value })}>
            <option value="">Todas as categorias</option>
            {categories.data?.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </Select>
        </div>
        <div>
          <label htmlFor="nivel" className="sr-only">Nível</label>
          <Select id="nivel" value={level} onChange={(e) => update({ nivel: e.target.value })}>
            <option value="">Todos os níveis</option>
            {Object.entries(LEVEL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </div>
        <div>
          <label htmlFor="ordem" className="sr-only">Ordenar por</label>
          <Select id="ordem" value={sort} onChange={(e) => update({ ordem: e.target.value })}>
            <option value="newest">Mais recentes</option>
            <option value="popular">Mais populares</option>
            <option value="title">Título (A–Z)</option>
            <option value="oldest">Mais antigos</option>
          </Select>
        </div>
        <Button type="submit">Buscar</Button>
      </form>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500" aria-live="polite" data-testid="results-count">
          {courses.data ? `${courses.data.meta.total} curso(s) encontrado(s)` : ' '}
        </p>
        {hasFilters && (
          <button className="text-sm font-medium text-brand-600 hover:text-brand-700" onClick={() => setParams(new URLSearchParams())}>
            Limpar filtros
          </button>
        )}
      </div>

      {courses.isError ? (
        <ErrorState message={errorMessage(courses.error)} onRetry={() => courses.refetch()} />
      ) : courses.isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-80" />)}</div>
      ) : courses.data!.data.length === 0 ? (
        <EmptyState
          icon={<SearchX className="size-6" aria-hidden />}
          title="Nenhum curso encontrado"
          description="Tente outros termos ou remova alguns filtros."
          action={hasFilters && <Button variant="outline" onClick={() => setParams(new URLSearchParams())}>Limpar filtros</Button>}
        />
      ) : (
        <>
          <section aria-label="Cursos" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.data!.data.map((c) => <CourseCard key={c.id} course={c} />)}
          </section>
          <Pagination page={page} totalPages={courses.data!.meta.totalPages} total={courses.data!.meta.total} onChange={(p) => update({ pagina: String(p) })} />
        </>
      )}
    </Container>
  );
}
