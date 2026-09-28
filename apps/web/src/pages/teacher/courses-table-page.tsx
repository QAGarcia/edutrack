import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { StatusBadge } from '../../components/course/course-visuals';
import { ButtonLink } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/feedback';
import { Input, Select } from '../../components/ui/field';
import { Container, PageHeader } from '../../components/ui/misc';
import { Pagination } from '../../components/ui/pagination';
import { api, errorMessage } from '../../lib/api';
import { formatDate, LEVEL_LABEL, STATUS_LABEL } from '../../lib/format';

/** Tabela de gestão de cursos. scope=mine (professor) ou scope=all (admin). */
export default function CoursesTablePage({ scope }: { scope: 'mine' | 'all' }) {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const search = params.get('busca') ?? '';
  const page = Number(params.get('pagina') ?? 1);
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    if (k !== 'pagina') n.delete('pagina');
    setParams(n);
  };

  const q = useQuery({
    queryKey: ['courses', scope, { status, search, page }],
    queryFn: () => api.courses.list({ scope, status, search, page, limit: 10, sort: 'newest' }),
    placeholderData: keepPreviousData,
  });

  return (
    <Container className="py-10">
      <PageHeader
        title={scope === 'mine' ? 'Meus cursos' : 'Todos os cursos'}
        description={scope === 'mine' ? 'Crie, publique e acompanhe seus cursos.' : 'Visão administrativa de todos os cursos da plataforma.'}
        actions={<ButtonLink to="/professor/cursos/novo"><Plus className="size-4" aria-hidden /> Novo curso</ButtonLink>}
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-72">
          <label htmlFor="busca-cursos" className="sr-only">Buscar</label>
          <Input id="busca-cursos" type="search" placeholder="Buscar por título" defaultValue={search} onKeyDown={(e) => e.key === 'Enter' && set('busca', e.currentTarget.value.trim())} />
        </div>
        <div className="w-48">
          <label htmlFor="filtro-status" className="sr-only">Status</label>
          <Select id="filtro-status" value={status} onChange={(e) => set('status', e.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </div>
      </div>
      <Card className="overflow-x-auto">
        {q.isLoading ? <Spinner /> : q.isError ? <div className="p-6"><ErrorState message={errorMessage(q.error)} /></div> : q.data!.data.length === 0 ? (
          <EmptyState title="Nenhum curso encontrado" action={<ButtonLink to="/professor/cursos/novo">Criar curso</ButtonLink>} />
        ) : (
          <table className="w-full text-sm" aria-label="Cursos">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium">Curso</th>
                {scope === 'all' && <th scope="col" className="px-6 py-3 font-medium">Professor</th>}
                <th scope="col" className="px-6 py-3 font-medium">Status</th>
                <th scope="col" className="px-6 py-3 font-medium">Aulas</th>
                <th scope="col" className="px-6 py-3 font-medium">Alunos</th>
                <th scope="col" className="px-6 py-3 font-medium">Criado em</th>
                <th scope="col" className="px-6 py-3"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {q.data!.data.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4">
                    <Link to={`/professor/cursos/${c.id}`} className="font-medium text-slate-900 hover:text-brand-700">{c.title}</Link>
                    <p className="text-xs text-slate-500">{c.category.name} · {LEVEL_LABEL[c.level]}</p>
                  </td>
                  {scope === 'all' && <td className="px-6 py-4 text-slate-600">{c.teacher.name}</td>}
                  <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                  <td className="px-6 py-4 text-slate-600">{c.lessonsCount}</td>
                  <td className="px-6 py-4 text-slate-600">{c.enrolledCount}/{c.capacity}</td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(c.createdAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <ButtonLink to={`/professor/cursos/${c.id}/turma`} variant="ghost" size="sm" aria-label={`Turma de ${c.title}`}>Turma</ButtonLink>
                      <ButtonLink to={`/professor/cursos/${c.id}`} variant="outline" size="sm" aria-label={`Editar ${c.title}`}>Editar</ButtonLink>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {q.data && <Pagination page={page} totalPages={q.data.meta.totalPages} total={q.data.meta.total} onChange={(p) => set('pagina', String(p))} />}
    </Container>
  );
}
