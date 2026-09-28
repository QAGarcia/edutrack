import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArrowDown, ArrowLeft, ArrowUp, ExternalLink, Pencil, Plus, Rocket, Trash2, Users } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { StatusBadge } from '../../components/course/course-visuals';
import { Button, ButtonLink } from '../../components/ui/button';
import { Card, CardHeader } from '../../components/ui/card';
import { ConfirmDialog, Dialog } from '../../components/ui/dialog';
import { Alert, EmptyState, ErrorState, Spinner } from '../../components/ui/feedback';
import { Field, Input, Select, Textarea } from '../../components/ui/field';
import { Container, PageHeader } from '../../components/ui/misc';
import { api, ApiError, errorMessage, type CourseInput } from '../../lib/api';
import { LEVEL_LABEL } from '../../lib/format';
import type { CourseDetail, LessonSummary } from '../../lib/types';

const courseSchema = z.object({
  title: z.string().trim().min(5, 'Mínimo de 5 caracteres').max(120, 'Máximo de 120 caracteres'),
  summary: z.string().trim().min(10, 'Mínimo de 10 caracteres').max(200, 'Máximo de 200 caracteres'),
  description: z.string().max(5000, 'Máximo de 5000 caracteres'),
  categoryId: z.string().min(1, 'Selecione uma categoria'),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], { message: 'Selecione o nível' }),
  workloadHours: z.number({ message: 'Informe a carga horária' }).int('Use um número inteiro').min(1, 'Mínimo 1 hora').max(400, 'Máximo 400 horas'),
  capacity: z.number({ message: 'Informe o número de vagas' }).int('Use um número inteiro').min(1, 'Mínimo 1 vaga').max(500, 'Máximo 500 vagas'),
});
type CourseForm = z.infer<typeof courseSchema>;

const lessonSchema = z.object({
  title: z.string().trim().min(3, 'Mínimo de 3 caracteres').max(120, 'Máximo de 120 caracteres'),
  durationMinutes: z.number({ message: 'Informe a duração' }).int('Use um número inteiro').min(1, 'Mínimo 1 minuto').max(600, 'Máximo 600 minutos'),
  content: z.string().max(20000, 'Conteúdo muito longo'),
});
type LessonForm = z.infer<typeof lessonSchema>;

const num = { setValueAs: (v: string) => (v === '' ? undefined : Number(v)) };

function LessonFormBody({ courseId, lesson, defaults, onClose }: { courseId: string; lesson: LessonSummary | null; defaults: LessonForm; onClose: () => void }) {
  const qc = useQueryClient();
  // Valores iniciais definidos na montagem: nada de reset tardio que "apaga" o que já foi digitado.
  const form = useForm<LessonForm>({ resolver: zodResolver(lessonSchema), defaultValues: defaults });
  const e = form.formState.errors;

  const save = form.handleSubmit(async (data) => {
    try {
      if (lesson) await api.courses.updateLesson(courseId, lesson.id, data);
      else await api.courses.addLesson(courseId, data);
      toast.success(lesson ? 'Aula atualizada' : 'Aula adicionada');
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['lesson', courseId] });
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <form onSubmit={save} noValidate className="space-y-4" aria-label="Dados da aula">
      <Field label="Título da aula" error={e.title?.message}>{({ id }) => <Input id={id} error={e.title?.message} {...form.register('title')} />}</Field>
      <Field label="Duração (minutos)" error={e.durationMinutes?.message}>{({ id }) => <Input id={id} type="number" min={1} error={e.durationMinutes?.message} {...form.register('durationMinutes', num)} />}</Field>
      <Field label="Conteúdo" error={e.content?.message}>{({ id }) => <Textarea id={id} rows={6} error={e.content?.message} {...form.register('content')} />}</Field>
      <div className="-mx-6 mt-6 flex justify-end gap-2 border-t border-slate-100 px-6 pt-4">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" loading={form.formState.isSubmitting}>{lesson ? 'Salvar aula' : 'Adicionar aula'}</Button>
      </div>
    </form>
  );
}

function LessonDialog({ open, onClose, courseId, lesson }: { open: boolean; onClose: () => void; courseId: string; lesson: LessonSummary | null }) {
  const full = useQuery({ queryKey: ['lesson', courseId, lesson?.id], queryFn: () => api.courses.lesson(courseId, lesson!.id), enabled: open && !!lesson });
  const ready = !lesson || !!full.data;
  return (
    <Dialog open={open} onClose={onClose} title={lesson ? 'Editar aula' : 'Nova aula'}>
      {!ready ? <Spinner label="Carregando aula..." /> : (
        <LessonFormBody
          key={lesson?.id ?? 'new'}
          courseId={courseId}
          lesson={lesson}
          onClose={onClose}
          defaults={lesson ? { title: lesson.title, durationMinutes: lesson.durationMinutes, content: full.data?.content ?? '' } : { title: '', durationMinutes: undefined as unknown as number, content: '' }}
        />
      )}
    </Dialog>
  );
}

function LessonsManager({ course }: { course: CourseDetail }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<LessonSummary | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<LessonSummary | null>(null);
  const readOnly = course.status === 'ARCHIVED';

  const refresh = () => qc.invalidateQueries({ queryKey: ['courses'] });
  const move = useMutation({
    mutationFn: (ids: string[]) => api.courses.reorderLessons(course.id, ids),
    onSuccess: refresh,
    onError: (err) => toast.error(errorMessage(err)),
  });
  const remove = useMutation({
    mutationFn: (lessonId: string) => api.courses.removeLesson(course.id, lessonId),
    onSuccess: () => { toast.success('Aula removida'); setToDelete(null); refresh(); },
    onError: (err) => { toast.error(errorMessage(err)); setToDelete(null); },
  });

  const swap = (i: number, j: number) => {
    const ids = course.lessons.map((l) => l.id);
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    move.mutate(ids);
  };

  return (
    <Card>
      <CardHeader
        title="Aulas"
        description={`${course.lessons.length} aula(s). A ordem abaixo é a ordem que o aluno verá.`}
        action={!readOnly && <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="size-4" aria-hidden /> Adicionar aula</Button>}
      />
      {course.lessons.length === 0 ? (
        <EmptyState title="Nenhuma aula ainda" description="Um curso precisa de pelo menos uma aula para ser publicado." />
      ) : (
        <ol className="divide-y divide-slate-100" aria-label="Aulas do curso">
          {course.lessons.map((l, i) => (
            <li key={l.id} className="flex items-center gap-3 px-6 py-3" data-testid="lesson-row">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{l.position}</span>
              <span className="flex-1 text-sm font-medium text-slate-800">{l.title}</span>
              <span className="text-xs text-slate-500">{l.durationMinutes} min</span>
              {!readOnly && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" aria-label={`Mover ${l.title} para cima`} disabled={i === 0 || move.isPending} onClick={() => swap(i, i - 1)}><ArrowUp className="size-4" /></Button>
                  <Button variant="ghost" size="sm" aria-label={`Mover ${l.title} para baixo`} disabled={i === course.lessons.length - 1 || move.isPending} onClick={() => swap(i, i + 1)}><ArrowDown className="size-4" /></Button>
                  <Button variant="ghost" size="sm" aria-label={`Editar ${l.title}`} onClick={() => { setEditing(l); setDialogOpen(true); }}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="sm" aria-label={`Excluir ${l.title}`} className="text-rose-600 hover:bg-rose-50" onClick={() => setToDelete(l)}><Trash2 className="size-4" /></Button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      <LessonDialog open={dialogOpen} onClose={() => setDialogOpen(false)} courseId={course.id} lesson={editing} />
      <ConfirmDialog open={!!toDelete} title="Excluir aula?" description={<>A aula <strong>{toDelete?.title}</strong> e o progresso dos alunos nela serão removidos.</>}
        confirmLabel="Excluir aula" loading={remove.isPending} onConfirm={() => toDelete && remove.mutate(toDelete.id)} onClose={() => setToDelete(null)} />
    </Card>
  );
}

function CourseInfoForm({ course }: { course?: CourseDetail }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const categories = useQuery({ queryKey: ['categories'], queryFn: api.categories.list });
  const archived = course?.status === 'ARCHIVED';
  // Valores iniciais na montagem (componente recriado por curso via "key"). Recarregar os dados do
  // curso — ex.: ao adicionar uma aula — NÃO apaga edições ainda não salvas.
  const form = useForm<CourseForm>({
    resolver: zodResolver(courseSchema),
    defaultValues: course
      ? { title: course.title, summary: course.summary, description: course.description, categoryId: course.category.id, level: course.level, workloadHours: course.workloadHours, capacity: course.capacity }
      : { description: '', level: 'BEGINNER' },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      const payload: CourseInput = { ...data };
      if (!course) {
        const created = await api.courses.create(payload);
        toast.success('Curso criado como rascunho. Agora adicione as aulas.');
        navigate(`/professor/cursos/${created.id}`, { replace: true });
      } else {
        await api.courses.update(course.id, payload);
        form.reset(data);
        toast.success('Alterações salvas');
      }
      qc.invalidateQueries({ queryKey: ['courses'] });
    } catch (err) {
      // Erros de validação do servidor voltam para os campos correspondentes.
      if (err instanceof ApiError && err.body.details) {
        err.body.details.forEach((d) => form.setError(d.field as keyof CourseForm, { message: d.message }));
      }
      toast.error(errorMessage(err));
    }
  });

  const e = form.formState.errors;
  return (
    <Card>
      <CardHeader title="Informações do curso" />
      <form onSubmit={onSubmit} noValidate aria-label="Informações do curso">
        <fieldset disabled={archived} className="grid gap-5 p-6 sm:grid-cols-2">
          <Field label="Título" error={e.title?.message} className="sm:col-span-2">{({ id: fid }) => <Input id={fid} error={e.title?.message} {...form.register('title')} />}</Field>
          <Field label="Resumo" error={e.summary?.message} hint="Aparece no card do catálogo (até 200 caracteres)." className="sm:col-span-2">{({ id: fid, describedBy }) => <Input id={fid} aria-describedby={describedBy} error={e.summary?.message} {...form.register('summary')} />}</Field>
          <Field label="Descrição completa" error={e.description?.message} className="sm:col-span-2">{({ id: fid }) => <Textarea id={fid} rows={5} error={e.description?.message} {...form.register('description')} />}</Field>
          <Field label="Categoria" error={e.categoryId?.message}>
            {({ id: fid }) => (
              <Select id={fid} error={e.categoryId?.message} {...form.register('categoryId')}>
                <option value="">Selecione...</option>
                {(categories.data ?? (course ? [course.category] : [])).map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Nível" error={e.level?.message}>
            {({ id: fid }) => (
              <Select id={fid} error={e.level?.message} {...form.register('level')}>
                {Object.entries(LEVEL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Carga horária (horas)" error={e.workloadHours?.message}>{({ id: fid }) => <Input id={fid} type="number" min={1} error={e.workloadHours?.message} {...form.register('workloadHours', num)} />}</Field>
          <Field label="Vagas" error={e.capacity?.message} hint={course ? `${course.enrolledCount} aluno(s) ativo(s) hoje.` : undefined}>{({ id: fid, describedBy }) => <Input id={fid} type="number" min={1} aria-describedby={describedBy} error={e.capacity?.message} {...form.register('capacity', num)} />}</Field>
          {!archived && (
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="submit" loading={form.formState.isSubmitting}>{course ? 'Salvar alterações' : 'Criar curso'}</Button>
            </div>
          )}
        </fieldset>
      </form>
    </Card>
  );
}

type Action = 'publish' | 'archive' | 'delete' | null;

export default function CourseEditorPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [action, setAction] = useState<Action>(null);
  const course = useQuery({ queryKey: ['courses', 'detail', id], queryFn: () => api.courses.get(id!), enabled: !isNew });

  const runAction = useMutation({
    mutationFn: async (a: Exclude<Action, null>) => {
      if (a === 'publish') return api.courses.publish(id!);
      if (a === 'archive') return api.courses.archive(id!);
      return api.courses.remove(id!);
    },
    onSuccess: (_d, a) => {
      toast.success(a === 'publish' ? 'Curso publicado!' : a === 'archive' ? 'Curso arquivado' : 'Curso excluído');
      setAction(null);
      qc.invalidateQueries({ queryKey: ['courses'] });
      if (a === 'delete') navigate('/professor/cursos');
    },
    onError: (err) => { toast.error(errorMessage(err)); setAction(null); },
  });

  if (!isNew && course.isLoading) return <Container className="py-10"><Spinner /></Container>;
  if (!isNew && course.isError) return <Container className="py-10"><ErrorState message={errorMessage(course.error)} /></Container>;
  const c = course.data;
  const archived = c?.status === 'ARCHIVED';

  return (
    <Container className="max-w-5xl py-10">
      <Link to="/professor/cursos" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800"><ArrowLeft className="size-4" aria-hidden /> Cursos</Link>
      <PageHeader
        title={isNew ? 'Novo curso' : c!.title}
        eyebrow={c && <StatusBadge status={c.status} />}
        description={isNew ? 'O curso começa como rascunho e só aparece no catálogo depois de publicado.' : undefined}
        actions={c && (
          <>
            {c.status !== 'DRAFT' && <ButtonLink to={`/cursos/${c.slug}`} variant="ghost"><ExternalLink className="size-4" aria-hidden /> Ver página</ButtonLink>}
            <ButtonLink to={`/professor/cursos/${c.id}/turma`} variant="outline"><Users className="size-4" aria-hidden /> Turma</ButtonLink>
            {c.status === 'DRAFT' && <Button variant="outline" className="text-rose-600" onClick={() => setAction('delete')}><Trash2 className="size-4" aria-hidden /> Excluir</Button>}
            {c.status === 'PUBLISHED' && <Button variant="outline" onClick={() => setAction('archive')}><Archive className="size-4" aria-hidden /> Arquivar</Button>}
            {c.status === 'DRAFT' && <Button onClick={() => setAction('publish')}><Rocket className="size-4" aria-hidden /> Publicar</Button>}
          </>
        )}
      />

      {archived && <div className="mb-6"><Alert tone="warning" title="Curso arquivado">Cursos arquivados ficam somente para consulta e não podem ser alterados.</Alert></div>}

      <div className="space-y-6">
        <CourseInfoForm key={c?.id ?? 'new'} course={c} />
        {c && <LessonsManager course={c} />}
      </div>

      <ConfirmDialog
        open={action === 'publish'} tone="primary" title="Publicar curso?"
        description="O curso passará a aparecer no catálogo e aceitará matrículas." confirmLabel="Publicar agora"
        loading={runAction.isPending} onConfirm={() => runAction.mutate('publish')} onClose={() => setAction(null)}
      />
      <ConfirmDialog
        open={action === 'archive'} title="Arquivar curso?"
        description="O curso sai do catálogo e não aceita novas matrículas. Alunos atuais mantêm o histórico. Esta ação não pode ser desfeita."
        confirmLabel="Arquivar curso" loading={runAction.isPending} onConfirm={() => runAction.mutate('archive')} onClose={() => setAction(null)}
      />
      <ConfirmDialog
        open={action === 'delete'} title="Excluir curso?" description="O rascunho e todas as suas aulas serão removidos permanentemente."
        confirmLabel="Excluir curso" loading={runAction.isPending} onConfirm={() => runAction.mutate('delete')} onClose={() => setAction(null)}
      />
    </Container>
  );
}
