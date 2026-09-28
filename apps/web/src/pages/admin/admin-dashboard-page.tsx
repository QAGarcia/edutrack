import { useQuery } from '@tanstack/react-query';
import { Award, BookOpen, GraduationCap, Presentation, UserPlus } from 'lucide-react';
import { Card, CardHeader } from '../../components/ui/card';
import { ErrorState, Spinner } from '../../components/ui/feedback';
import { Avatar, Container, PageHeader, StatCard } from '../../components/ui/misc';
import { ProgressBar } from '../../components/ui/progress';
import { api, errorMessage } from '../../lib/api';
import { formatDate } from '../../lib/format';

export default function AdminDashboardPage() {
  const q = useQuery({ queryKey: ['dashboard', 'admin'], queryFn: api.dashboard.admin });
  return (
    <Container className="py-10">
      <PageHeader title="Visão geral" description="Indicadores da plataforma em tempo real." />
      {q.isLoading && <Spinner />}
      {q.isError && <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />}
      {q.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Alunos ativos" value={q.data.activeUsers.STUDENT} icon={<GraduationCap className="size-5" />} />
            <StatCard label="Professores ativos" value={q.data.activeUsers.TEACHER} icon={<Presentation className="size-5" />} tone="info" />
            <StatCard label="Cursos publicados" value={q.data.courses.PUBLISHED} icon={<BookOpen className="size-5" />} tone="success" hint={`${q.data.courses.DRAFT} rascunhos · ${q.data.courses.ARCHIVED} arquivados`} />
            <StatCard label="Certificados emitidos" value={q.data.certificatesIssued} icon={<Award className="size-5" />} tone="warning" hint={`${q.data.enrollments.active} matrículas ativas`} />
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Cursos com mais alunos" />
              <ul className="divide-y divide-slate-100">
                {q.data.topCourses.map((c, i) => (
                  <li key={c.id} className="flex items-center gap-4 px-6 py-4">
                    <span className="text-sm font-bold text-slate-400">#{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{c.title}</p>
                      <ProgressBar value={(c.enrolled / c.capacity) * 100} label={`Ocupação de ${c.title}`} className="mt-2" />
                    </div>
                    <span className="text-sm text-slate-600">{c.enrolled}/{c.capacity}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardHeader title="Matrículas recentes" />
              <ul className="divide-y divide-slate-100">
                {q.data.recentEnrollments.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-6 py-3">
                    <Avatar name={e.studentName} size="sm" />
                    <div className="flex-1 text-sm">
                      <p className="font-medium text-slate-900">{e.studentName}</p>
                      <p className="text-slate-500">{e.courseTitle}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500"><UserPlus className="size-3.5" aria-hidden />{formatDate(e.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </Container>
  );
}
