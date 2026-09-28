import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '../../auth/auth-context';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { ConfirmDialog } from '../../components/ui/dialog';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/feedback';
import { Input, Select } from '../../components/ui/field';
import { Avatar, Container, PageHeader } from '../../components/ui/misc';
import { Pagination } from '../../components/ui/pagination';
import { api, errorMessage } from '../../lib/api';
import { formatDate, ROLE_LABEL } from '../../lib/format';
import type { User } from '../../lib/types';

export default function UsersPage() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [target, setTarget] = useState<User | null>(null);
  const search = params.get('busca') ?? '';
  const role = params.get('perfil') ?? '';
  const isActive = params.get('situacao') ?? '';
  const page = Number(params.get('pagina') ?? 1);
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    if (k !== 'pagina') n.delete('pagina');
    setParams(n);
  };

  const q = useQuery({
    queryKey: ['users', { search, role, isActive, page }],
    queryFn: () => api.users.list({ search, role, isActive, page, limit: 10 }),
    placeholderData: keepPreviousData,
  });

  const toggle = useMutation({
    mutationFn: (u: User) => api.users.setStatus(u.id, !u.isActive),
    onSuccess: (u) => {
      toast.success(u.isActive ? `${u.name} foi reativado(a)` : `${u.name} foi desativado(a)`);
      setTarget(null);
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => { toast.error(errorMessage(err)); setTarget(null); },
  });

  return (
    <Container className="py-10">
      <PageHeader title="Usuários" description="Gerencie o acesso de alunos, professores e administradores." />
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-72">
          <label htmlFor="busca-usuarios" className="sr-only">Buscar usuários</label>
          <Input id="busca-usuarios" type="search" placeholder="Buscar por nome ou e-mail" defaultValue={search} onKeyDown={(e) => e.key === 'Enter' && set('busca', e.currentTarget.value.trim())} />
        </div>
        <div className="w-44">
          <label htmlFor="filtro-perfil" className="sr-only">Perfil</label>
          <Select id="filtro-perfil" value={role} onChange={(e) => set('perfil', e.target.value)}>
            <option value="">Todos os perfis</option>
            {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </div>
        <div className="w-52">
          <label htmlFor="filtro-situacao" className="sr-only">Situação</label>
          <Select id="filtro-situacao" value={isActive} onChange={(e) => set('situacao', e.target.value)}>
            <option value="">Todas as situações</option>
            <option value="true">Ativos</option>
            <option value="false">Desativados</option>
          </Select>
        </div>
      </div>
      <Card className="overflow-x-auto">
        {q.isLoading ? <Spinner /> : q.isError ? <div className="p-6"><ErrorState message={errorMessage(q.error)} /></div> : q.data!.data.length === 0 ? (
          <EmptyState title="Nenhum usuário encontrado" />
        ) : (
          <table className="w-full text-sm" aria-label="Usuários">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium">Usuário</th>
                <th scope="col" className="px-6 py-3 font-medium">Perfil</th>
                <th scope="col" className="px-6 py-3 font-medium">Situação</th>
                <th scope="col" className="px-6 py-3 font-medium">Desde</th>
                <th scope="col" className="px-6 py-3"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {q.data!.data.map((u) => (
                <tr key={u.id} data-testid="user-row">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} size="sm" />
                      <div><p className="font-medium text-slate-900">{u.name}</p><p className="text-xs text-slate-500">{u.email}</p></div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><Badge tone={u.role === 'ADMIN' ? 'brand' : u.role === 'TEACHER' ? 'info' : 'neutral'}>{ROLE_LABEL[u.role]}</Badge></td>
                  <td className="px-6 py-4">{u.isActive ? <Badge tone="success">Ativo</Badge> : <Badge tone="danger">Desativado</Badge>}</td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(u.createdAt)}</td>
                  <td className="px-6 py-4 text-right">
                    {u.id !== me?.id && (
                      <Button size="sm" variant={u.isActive ? 'outline' : 'secondary'} onClick={() => setTarget(u)} aria-label={`${u.isActive ? 'Desativar' : 'Reativar'} ${u.name}`}>
                        {u.isActive ? 'Desativar' : 'Reativar'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {q.data && <Pagination page={page} totalPages={q.data.meta.totalPages} total={q.data.meta.total} onChange={(p) => set('pagina', String(p))} />}
      <ConfirmDialog
        open={!!target}
        tone={target?.isActive ? 'danger' : 'primary'}
        title={target?.isActive ? 'Desativar usuário?' : 'Reativar usuário?'}
        description={target?.isActive
          ? <><strong>{target?.name}</strong> perderá o acesso imediatamente, inclusive sessões abertas.</>
          : <><strong>{target?.name}</strong> voltará a ter acesso à plataforma.</>}
        confirmLabel={target?.isActive ? 'Desativar' : 'Reativar'}
        loading={toggle.isPending}
        onConfirm={() => target && toggle.mutate(target)}
        onClose={() => setTarget(null)}
      />
    </Container>
  );
}
