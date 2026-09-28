import { useQuery } from '@tanstack/react-query';
import { BookOpen, ClipboardList, Plus, Star, Users } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '../../auth/auth-context';
import { StatusBadge } from '../../components/course/course-visuals';
import { ButtonLink } from '../../components/ui/button';
import { Card, CardHeader } from '../../components/ui/card';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/feedback';
import { Container, PageHeader, StatCard } from '../../components/ui/misc';
import { ProgressBar } from '../../components/ui/progress';
import { api, errorMessage } from '../../lib/api';
import { formatGrade } from '../../lib/format';

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['dashboard', 'teacher'], queryFn: api.dashboard.teacher });

  return (
    <Container className="py-10">
      <PageHeader
        title={`Olá, prof. ${user?.name.split(' ')[0]}`}
        description="Resumo das suas turmas e pendências."
        actions={<ButtonLink to="/professor/cursos/novo"><Plus className="size-4" aria-hidden /> Novo curso</ButtonLink>}
      />
      {q.isLoading && <Spinner />}
      {q.isError && <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />}
      {q.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Cursos publicados" value={q.data.courses.PUBLISHED} icon={<BookOpen className="size-5" />} hint={`${q.data.courses.DRAFT} em rascunho · ${q.data.courses.ARCHIVED} arquivados`} />
            <StatCard label="Alunos ativos" value={q.data.activeStudents} icon={<Users className="size-5" />} tone="info" />
            <StatCard label="Média geral das notas" value={formatGrade(q.data.averageGrade)} icon={<Star className="size-5" />} tone="success" />
            <StatCard label="Aguardando notas" value={q.data.enrollmentsPendingGrades} icon={<ClipboardList className="size-5" />} tone="warning" hint="Matrículas ativas com menos de 2 avaliações" />
          </div>
          <Card className="mt-8">
            <CardHeader title="Seus cursos mais procurados" action={<Link to="/professor/cursos" className="text-sm font-semibold text-brand-600">Ver todos</Link>} />
            {q.data.topCourses.length === 0 ? (
              <EmptyState title="Você ainda não criou cursos" action={<ButtonLink to="/professor/cursos/novo">Criar primeiro curso</ButtonLink>} />
            ) : (
              <ul className="divide-y divide-slate-100">
                {q.data.topCourses.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                    <div className="min-w-48 flex-1">
                      <Link to={`/professor/cursos/${c.id}`} className="font-medium text-slate-900 hover:text-brand-700">{c.title}</Link>
                      <div className="mt-1">{c.status && <StatusBadge status={c.status} />}</div>
                    </div>
                    <div className="w-48">
                      <p className="mb-1 text-xs text-slate-500">{c.enrolled}/{c.capacity} vagas ocupadas</p>
                      <ProgressBar value={(c.enrolled / c.capacity) * 100} label={`Ocupação de ${c.title}`} />
                    </div>
                    <ButtonLink to={`/professor/cursos/${c.id}/turma`} variant="outline" size="sm">Turma</ButtonLink>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </Container>
  );
}
