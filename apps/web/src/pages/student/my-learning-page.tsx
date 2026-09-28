import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, BookOpen, CheckCircle2, GraduationCap, PlayCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '../../auth/auth-context';
import { CourseCover, SituationBadge } from '../../components/course/course-visuals';
import { Button, ButtonLink } from '../../components/ui/button';
import { ConfirmDialog } from '../../components/ui/dialog';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/feedback';
import { Container, PageHeader, StatCard } from '../../components/ui/misc';
import { ProgressBar } from '../../components/ui/progress';
import { api, errorMessage } from '../../lib/api';
import { cn } from '../../lib/cn';
import { formatGrade } from '../../lib/format';
import type { Enrollment } from '../../lib/types';

type Tab = 'active' | 'approved' | 'cancelled';
const TABS: { key: Tab; label: string }[] = [
  { key: 'active', label: 'Em curso' },
  { key: 'approved', label: 'Concluídos' },
  { key: 'cancelled', label: 'Cancelados' },
];

function EnrollmentCard({ e, onCancel }: { e: Enrollment; onCancel: (e: Enrollment) => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const issue = useMutation({
    mutationFn: () => api.enrollments.certificate(e.id),
    onSuccess: (c) => {
      toast.success('Certificado emitido!');
      qc.invalidateQueries({ queryKey: ['enrollments'] });
      navigate(`/certificados/${c.code}`);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const canCancel = e.status === 'ACTIVE' && e.grades.length === 0;

  return (
    <article data-testid="enrollment-card" aria-labelledby={`enr-${e.id}`} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card sm:flex-row">
      <CourseCover categorySlug={e.course.category.slug} className="h-28 sm:h-auto sm:w-44" iconSize="size-8" />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{e.course.category.name}</p>
            <h3 id={`enr-${e.id}`} className="mt-1 text-lg font-semibold text-slate-900">{e.course.title}</h3>
            <p className="text-sm text-slate-500">com {e.course.teacher.name}</p>
          </div>
          <SituationBadge situation={e.situation} />
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-xs text-slate-500">
            <span>{e.progress.completedLessons} de {e.progress.totalLessons} aulas</span>
            <span className="font-semibold text-slate-700">{e.progress.percent}%</span>
          </div>
          <ProgressBar value={e.progress.percent} label={`Progresso em ${e.course.title}`} tone={e.progress.percent === 100 ? 'success' : 'brand'} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <dl className="flex gap-5 text-sm">
            <div><dt className="text-slate-500">Notas</dt><dd className="font-medium text-slate-800">{e.grades.length ? e.grades.map((g) => `${g.assessment}: ${formatGrade(g.value)}`).join(' · ') : '—'}</dd></div>
            <div><dt className="text-slate-500">Média</dt><dd className="font-semibold text-slate-900" data-testid="average">{formatGrade(e.average)}</dd></div>
          </dl>
          <div className="flex flex-wrap gap-2">
            {canCancel && <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => onCancel(e)}>Cancelar matrícula</Button>}
            {e.certificate ? (
              <ButtonLink to={`/certificados/${e.certificate.code}`} size="sm" variant="secondary"><Award className="size-4" aria-hidden /> Ver certificado</ButtonLink>
            ) : e.situation === 'APPROVED' ? (
              <Button size="sm" variant="success" onClick={() => issue.mutate()} loading={issue.isPending}><Award className="size-4" aria-hidden /> Emitir certificado</Button>
            ) : null}
            {e.status === 'ACTIVE' && <ButtonLink to={`/aprender/${e.id}`} size="sm"><PlayCircle className="size-4" aria-hidden /> {e.progress.completedLessons ? 'Continuar' : 'Começar'}</ButtonLink>}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function MyLearningPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('active');
  const [toCancel, setToCancel] = useState<Enrollment | null>(null);
  const q = useQuery({ queryKey: ['enrollments', 'me'], queryFn: api.enrollments.mine });

  const cancel = useMutation({
    mutationFn: (id: string) => api.enrollments.cancel(id),
    onSuccess: () => {
      toast.success('Matrícula cancelada');
      setToCancel(null);
      qc.invalidateQueries({ queryKey: ['enrollments'] });
      qc.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const groups = useMemo(() => {
    const all = q.data ?? [];
    return {
      active: all.filter((e) => e.status === 'ACTIVE' && e.situation !== 'APPROVED'),
      approved: all.filter((e) => e.situation === 'APPROVED'),
      cancelled: all.filter((e) => e.status === 'CANCELLED'),
    };
  }, [q.data]);

  return (
    <Container className="py-10">
      <PageHeader title={`Olá, ${user?.name.split(' ')[0]}!`} description="Acompanhe seu progresso, notas e certificados." actions={<ButtonLink to="/cursos" variant="outline">Explorar cursos</ButtonLink>} />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Cursos em andamento" value={q.data ? groups.active.length : '–'} icon={<BookOpen className="size-5" />} />
        <StatCard label="Cursos concluídos" value={q.data ? groups.approved.length : '–'} icon={<CheckCircle2 className="size-5" />} tone="success" />
        <StatCard label="Certificados" value={q.data ? q.data.filter((e) => e.certificate).length : '–'} icon={<Award className="size-5" />} tone="warning" />
      </div>

      <div role="tablist" aria-label="Filtrar matrículas" className="mb-6 inline-flex rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            className={cn('rounded-lg px-4 py-2 text-sm font-medium transition', tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
            {t.label} <span className="ml-1 text-xs text-slate-400">{q.data ? groups[t.key].length : ''}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-label={TABS.find((t) => t.key === tab)!.label} className="space-y-4">
        {q.isLoading && [0, 1].map((i) => <Skeleton key={i} className="h-44" />)}
        {q.isError && <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />}
        {q.data && groups[tab].length === 0 && (
          <EmptyState
            icon={tab === 'cancelled' ? <XCircle className="size-6" /> : <GraduationCap className="size-6" />}
            title={tab === 'active' ? 'Nenhum curso em andamento' : tab === 'approved' ? 'Nenhum curso concluído ainda' : 'Nenhuma matrícula cancelada'}
            description={tab === 'active' ? 'Que tal começar algo novo hoje?' : undefined}
            action={tab === 'active' && <ButtonLink to="/cursos">Ver catálogo</ButtonLink>}
          />
        )}
        {groups[tab].map((e) => <EnrollmentCard key={e.id} e={e} onCancel={setToCancel} />)}
      </div>

      <ConfirmDialog
        open={!!toCancel}
        title="Cancelar matrícula?"
        description={<>Você perderá o progresso em <strong>{toCancel?.course.title}</strong>. Será possível se matricular de novo se houver vagas.</>}
        confirmLabel="Sim, cancelar matrícula"
        loading={cancel.isPending}
        onConfirm={() => toCancel && cancel.mutate(toCancel.id)}
        onClose={() => setToCancel(null)}
      />
    </Container>
  );
}
