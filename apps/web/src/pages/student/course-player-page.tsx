import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Award, CheckCircle2, Circle, Clock, RotateCcw } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { SituationBadge } from '../../components/course/course-visuals';
import { Button, ButtonLink } from '../../components/ui/button';
import { Alert, ErrorState, Skeleton, Spinner } from '../../components/ui/feedback';
import { Container } from '../../components/ui/misc';
import { ProgressBar } from '../../components/ui/progress';
import { api, errorMessage } from '../../lib/api';
import { cn } from '../../lib/cn';
import { formatGrade } from '../../lib/format';
import type { Enrollment } from '../../lib/types';

function ReportCard({ e }: { e: Enrollment }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const issue = useMutation({
    mutationFn: () => api.enrollments.certificate(e.id),
    onSuccess: (c) => { qc.invalidateQueries({ queryKey: ['enrollments'] }); navigate(`/certificados/${c.code}`); },
    onError: (err) => toast.error(errorMessage(err)),
  });
  return (
    <section aria-labelledby="boletim" className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 id="boletim" className="font-semibold text-slate-900">Boletim</h2>
        <SituationBadge situation={e.situation} />
      </div>
      {e.grades.length ? (
        <table className="mt-4 w-full text-sm" aria-label="Notas">
          <thead><tr className="text-left text-xs uppercase text-slate-500"><th className="pb-2 font-medium">Avaliação</th><th className="pb-2 text-right font-medium">Nota</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {e.grades.map((g) => <tr key={g.id}><td className="py-2 text-slate-700">{g.assessment}</td><td className="py-2 text-right font-semibold text-slate-900">{formatGrade(g.value)}</td></tr>)}
          </tbody>
          <tfoot><tr className="border-t border-slate-200"><td className="pt-2 font-medium text-slate-700">Média</td><td className="pt-2 text-right text-base font-bold text-slate-900" data-testid="average">{formatGrade(e.average)}</td></tr></tfoot>
        </table>
      ) : (
        <p className="mt-3 text-sm text-slate-500">Nenhuma nota lançada ainda.</p>
      )}
      <p className="mt-4 text-xs text-slate-500">
        Aprovação: mínimo de {e.policy.minAssessments} avaliações, média ≥ {formatGrade(e.policy.passingAverage)} e {e.policy.minProgressPercent}% das aulas concluídas.
      </p>
      {e.certificate ? (
        <ButtonLink to={`/certificados/${e.certificate.code}`} variant="secondary" className="mt-4 w-full"><Award className="size-4" aria-hidden /> Ver certificado</ButtonLink>
      ) : e.situation === 'APPROVED' ? (
        <Button variant="success" className="mt-4 w-full" onClick={() => issue.mutate()} loading={issue.isPending}><Award className="size-4" aria-hidden /> Emitir certificado</Button>
      ) : null}
    </section>
  );
}

export default function CoursePlayerPage() {
  const { enrollmentId = '', lessonId } = useParams();
  const qc = useQueryClient();
  const enrollment = useQuery({ queryKey: ['enrollments', enrollmentId], queryFn: () => api.enrollments.get(enrollmentId) });
  const courseId = enrollment.data?.course.id;
  const course = useQuery({ queryKey: ['courses', 'detail', courseId], queryFn: () => api.courses.get(courseId!), enabled: !!courseId });

  const lessons = course.data?.lessons ?? [];
  const done = new Set(enrollment.data?.progress.completedLessonIds ?? []);
  const currentId = lessonId ?? lessons.find((l) => !done.has(l.id))?.id ?? lessons[0]?.id;
  const idx = lessons.findIndex((l) => l.id === currentId);
  const lesson = useQuery({
    queryKey: ['lesson', courseId, currentId],
    queryFn: () => api.courses.lesson(courseId!, currentId!),
    enabled: !!courseId && !!currentId && enrollment.data?.status === 'ACTIVE',
  });

  const toggle = useMutation({
    mutationFn: (complete: boolean) => (complete ? api.enrollments.complete(enrollmentId, currentId!) : api.enrollments.undo(enrollmentId, currentId!)),
    onSuccess: (e, complete) => {
      qc.setQueryData(['enrollments', enrollmentId], e);
      qc.invalidateQueries({ queryKey: ['enrollments', 'me'] });
      if (complete) toast.success(e.progress.percent === 100 ? 'Parabéns! Você concluiu todas as aulas.' : 'Aula concluída!');
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (enrollment.isError) return <Container className="py-10"><ErrorState message={errorMessage(enrollment.error)} /></Container>;
  if (!enrollment.data || !course.data) return <Container className="py-10"><Spinner /></Container>;
  if (lessonId && idx === -1) return <Navigate to={`/aprender/${enrollmentId}`} replace />;
  // Fixa a aula atual na URL: concluir uma aula não troca a tela sozinho, e o link é compartilhável.
  if (!lessonId && currentId) return <Navigate to={`/aprender/${enrollmentId}/${currentId}`} replace />;

  const e = enrollment.data;
  const isDone = currentId ? done.has(currentId) : false;
  const prev = lessons[idx - 1];
  const next = lessons[idx + 1];

  return (
    <Container className="py-8">
      <Link to="/meu-aprendizado" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="size-4" aria-hidden /> Meu aprendizado
      </Link>
      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-6 lg:order-none">
          <section aria-labelledby="progresso" className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{e.course.category.name}</p>
            <h1 id="progresso" className="mt-1 font-semibold text-slate-900">{e.course.title}</h1>
            <div className="mt-4 mb-1.5 flex justify-between text-xs text-slate-500">
              <span>{e.progress.completedLessons}/{e.progress.totalLessons} aulas</span>
              <span className="font-semibold text-slate-700" data-testid="progress-percent">{e.progress.percent}%</span>
            </div>
            <ProgressBar value={e.progress.percent} label="Progresso no curso" tone={e.progress.percent === 100 ? 'success' : 'brand'} />
            <nav aria-label="Aulas do curso" className="mt-5">
              <ol className="space-y-1">
                {lessons.map((l) => {
                  const active = l.id === currentId;
                  return (
                    <li key={l.id}>
                      <Link to={`/aprender/${enrollmentId}/${l.id}`} aria-current={active ? 'page' : undefined}
                        className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition', active ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-50')}>
                        {done.has(l.id)
                          ? <CheckCircle2 className="size-4 shrink-0 text-emerald-500" aria-label="Concluída" />
                          : <Circle className="size-4 shrink-0 text-slate-300" aria-label="Pendente" />}
                        <span className="flex-1">{l.position}. {l.title}</span>
                        <span className="text-xs text-slate-400">{l.durationMinutes}m</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </section>
          <ReportCard e={e} />
        </aside>

        <article aria-labelledby="titulo-aula" className="rounded-2xl border border-slate-200/80 bg-white shadow-card">
          {e.status !== 'ACTIVE' ? (
            <div className="p-8"><Alert tone="warning" title="Matrícula cancelada">O conteúdo das aulas fica disponível apenas para matrículas ativas.</Alert></div>
          ) : lesson.isLoading || !lesson.data ? (
            <div className="space-y-4 p-8"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-40" /></div>
          ) : (
            <>
              <header className="border-b border-slate-100 px-8 py-6">
                <p className="text-sm font-medium text-slate-500">Aula {lesson.data.position} de {lessons.length}</p>
                <h2 id="titulo-aula" className="mt-1 text-2xl font-bold text-slate-900">{lesson.data.title}</h2>
                <p className="mt-2 inline-flex items-center gap-1 text-sm text-slate-500"><Clock className="size-4" aria-hidden /> {lesson.data.durationMinutes} minutos</p>
              </header>
              <div className="whitespace-pre-line px-8 py-8 leading-relaxed text-slate-700" data-testid="lesson-content">{lesson.data.content || 'Esta aula ainda não possui conteúdo em texto.'}</div>
              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-8 py-5">
                {prev ? <ButtonLink to={`/aprender/${enrollmentId}/${prev.id}`} variant="ghost"><ArrowLeft className="size-4" aria-hidden /> Aula anterior</ButtonLink> : <span />}
                <div className="flex flex-wrap gap-2">
                  {isDone ? (
                    <Button variant="outline" onClick={() => toggle.mutate(false)} loading={toggle.isPending}><RotateCcw className="size-4" aria-hidden /> Marcar como não concluída</Button>
                  ) : (
                    <Button variant="success" onClick={() => toggle.mutate(true)} loading={toggle.isPending}><CheckCircle2 className="size-4" aria-hidden /> Marcar como concluída</Button>
                  )}
                  {next && <ButtonLink to={`/aprender/${enrollmentId}/${next.id}`}>Próxima aula <ArrowRight className="size-4" aria-hidden /></ButtonLink>}
                </div>
              </footer>
            </>
          )}
        </article>
      </div>
    </Container>
  );
}
