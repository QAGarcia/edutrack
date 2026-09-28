import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BarChart3, CheckCircle2, Clock, Lock, PlayCircle, Users } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '../../auth/auth-context';
import { CourseCover, LevelBadge, StatusBadge } from '../../components/course/course-visuals';
import { Button, ButtonLink } from '../../components/ui/button';
import { Alert, ErrorState, Skeleton } from '../../components/ui/feedback';
import { Avatar, Container } from '../../components/ui/misc';
import { ProgressBar } from '../../components/ui/progress';
import { api, ApiError, errorMessage } from '../../lib/api';
import { formatMinutes, LEVEL_LABEL } from '../../lib/format';
import type { CourseDetail } from '../../lib/types';
import NotFoundPage from './not-found-page';

function EnrollPanel({ course }: { course: CourseDetail }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const enroll = useMutation({
    mutationFn: () => api.enrollments.create(course.id),
    onSuccess: (e) => {
      toast.success('Matrícula realizada! Bons estudos.');
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['enrollments'] });
      navigate(`/aprender/${e.id}`);
    },
    onError: (err) => {
      toast.error(errorMessage(err));
      qc.invalidateQueries({ queryKey: ['courses', 'detail', course.slug] });
    },
  });

  const occupancy = Math.round((course.enrolledCount / course.capacity) * 100);
  let action: React.ReactNode;
  if (course.status === 'ARCHIVED') {
    action = <Alert tone="warning" title="Turma encerrada">Este curso não aceita novas matrículas.</Alert>;
  } else if (course.status === 'DRAFT') {
    action = <Alert tone="warning" title="Curso em rascunho">Visível apenas para você e administradores até ser publicado.</Alert>;
  } else if (!user) {
    action = (
      <ButtonLink to={`/entrar?redirect=${encodeURIComponent(location.pathname)}`} size="lg" className="w-full">
        Entre para se matricular
      </ButtonLink>
    );
  } else if (course.viewer?.enrollmentId) {
    action = <ButtonLink to={`/aprender/${course.viewer.enrollmentId}`} size="lg" className="w-full">Continuar curso</ButtonLink>;
  } else if (user.role !== 'STUDENT') {
    action = course.viewer?.isOwner || user.role === 'ADMIN'
      ? <ButtonLink to={`/professor/cursos/${course.id}`} size="lg" variant="outline" className="w-full">Gerenciar curso</ButtonLink>
      : <p className="text-center text-sm text-slate-500">Apenas alunos podem se matricular.</p>;
  } else if (course.seatsLeft === 0) {
    action = <Button size="lg" className="w-full" disabled>Turma esgotada</Button>;
  } else {
    action = <Button size="lg" className="w-full" onClick={() => enroll.mutate()} loading={enroll.isPending}>Matricular-se</Button>;
  }

  return (
    <aside aria-label="Matrícula" className="self-start overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lift lg:sticky lg:top-24">
      <CourseCover categorySlug={course.category.slug} className="hidden h-40 lg:block" iconSize="size-14" />
      <div className="space-y-5 p-6">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div><dt className="text-slate-500">Carga horária</dt><dd className="font-semibold text-slate-900">{course.workloadHours} horas</dd></div>
          <div><dt className="text-slate-500">Nível</dt><dd className="font-semibold text-slate-900">{LEVEL_LABEL[course.level]}</dd></div>
          <div><dt className="text-slate-500">Aulas</dt><dd className="font-semibold text-slate-900">{course.lessonsCount}</dd></div>
          <div><dt className="text-slate-500">Duração</dt><dd className="font-semibold text-slate-900">{formatMinutes(course.totalMinutes)}</dd></div>
        </dl>
        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-slate-500">Vagas</span>
            <span className="font-semibold text-slate-900" data-testid="seats-left">
              {course.seatsLeft > 0 ? `${course.seatsLeft} de ${course.capacity} disponíveis` : 'Esgotado'}
            </span>
          </div>
          <ProgressBar value={occupancy} label="Ocupação da turma" />
        </div>
        {action}
      </div>
    </aside>
  );
}

export default function CourseDetailPage() {
  const { slug = '' } = useParams();
  const q = useQuery({ queryKey: ['courses', 'detail', slug], queryFn: () => api.courses.get(slug) });

  if (q.isError && q.error instanceof ApiError && q.error.status === 404) return <NotFoundPage what="curso" />;
  if (q.isError) return <Container className="py-10"><ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} /></Container>;
  if (!q.data) {
    return (
      <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-6 w-full" /><Skeleton className="h-64" /></div>
        <Skeleton className="h-96" />
      </Container>
    );
  }
  const c = q.data;

  return (
    <>
      <section className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
        <Container className="py-10">
          <Link to="/cursos" className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
            <ArrowLeft className="size-4" aria-hidden /> Voltar ao catálogo
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/cursos?categoria=${c.category.slug}`} className="text-sm font-semibold uppercase tracking-wide text-brand-600">{c.category.name}</Link>
            <LevelBadge level={c.level} />
            {c.status !== 'PUBLISHED' && <StatusBadge status={c.status} />}
          </div>
          <h1 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{c.title}</h1>
          <p className="mt-3 max-w-3xl text-lg text-slate-600">{c.summary}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
            <span className="flex items-center gap-2"><Avatar name={c.teacher.name} size="sm" /> {c.teacher.name}</span>
            <span className="inline-flex items-center gap-1.5"><Users className="size-4" aria-hidden /> {c.enrolledCount} alunos</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="size-4" aria-hidden /> {c.workloadHours}h</span>
            <span className="inline-flex items-center gap-1.5"><BarChart3 className="size-4" aria-hidden /> {LEVEL_LABEL[c.level]}</span>
          </div>
        </Container>
      </section>

      <Container className="grid gap-10 py-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-10">
          <section aria-labelledby="sobre">
            <h2 id="sobre" className="text-xl font-bold text-slate-900">Sobre o curso</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-600">{c.description || c.summary}</p>
          </section>

          <section aria-labelledby="conteudo-programatico">
            <div className="flex items-end justify-between">
              <h2 id="conteudo-programatico" className="text-xl font-bold text-slate-900">Conteúdo do curso</h2>
              <p className="text-sm text-slate-500">{c.lessonsCount} aulas · {formatMinutes(c.totalMinutes)}</p>
            </div>
            {c.lessons.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Nenhuma aula cadastrada ainda.</p>
            ) : (
              <ol className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card" aria-label="Aulas">
                {c.lessons.map((l) => (
                  <li key={l.id} className="flex items-center gap-4 px-5 py-4">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{l.position}</span>
                    <span className="flex-1 text-sm font-medium text-slate-800">{l.title}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      {c.viewer?.enrollmentId || c.viewer?.isOwner ? <PlayCircle className="size-3.5" aria-hidden /> : <Lock className="size-3.5" aria-hidden />}
                      {l.durationMinutes} min
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby="professor" className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card">
            <h2 id="professor" className="text-xl font-bold text-slate-900">Seu professor</h2>
            <div className="mt-4 flex gap-4">
              <Avatar name={c.teacher.name} size="lg" />
              <div>
                <p className="font-semibold text-slate-900">{c.teacher.name}</p>
                <p className="mt-1 text-sm text-slate-600">{c.teacher.bio || 'Professor(a) da plataforma EduTrack.'}</p>
              </div>
            </div>
          </section>

          <section aria-labelledby="aprovacao" className="rounded-2xl bg-brand-50/60 p-6">
            <h2 id="aprovacao" className="font-semibold text-slate-900">Como funciona a aprovação</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {['No mínimo 2 avaliações lançadas pelo professor', 'Média final igual ou superior a 6,0', 'Pelo menos 75% das aulas concluídas', 'Certificado digital com código de verificação'].map((t) => (
                <li key={t} className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 text-brand-600" aria-hidden />{t}</li>
              ))}
            </ul>
          </section>
        </div>
        <EnrollPanel course={c} />
      </Container>
    </>
  );
}
