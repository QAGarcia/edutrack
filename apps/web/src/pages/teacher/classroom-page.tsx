import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Lock, Plus } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { SituationBadge, StatusBadge } from '../../components/course/course-visuals';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Dialog } from '../../components/ui/dialog';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/feedback';
import { Field, Input } from '../../components/ui/field';
import { Avatar, Container, PageHeader } from '../../components/ui/misc';
import { ProgressBar } from '../../components/ui/progress';
import { api, ApiError, errorMessage } from '../../lib/api';
import { formatGrade } from '../../lib/format';
import type { Enrollment, Grade } from '../../lib/types';

const gradeValue = z
  .number({ message: 'Informe a nota' })
  .min(0, 'A nota mínima é 0')
  .max(10, 'A nota máxima é 10')
  .refine((v) => Math.round(v * 100) === v * 100, 'Use no máximo 2 casas decimais');

const newGradeSchema = z.object({
  assessment: z.string().trim().min(1, 'Informe a avaliação').max(20, 'Máximo de 20 caracteres').regex(/^[\p{L}\d][\p{L}\d -]*$/u, 'Use letras, números, espaço ou hífen'),
  value: gradeValue,
});
const editGradeSchema = z.object({ value: gradeValue });
const num = { setValueAs: (v: string) => (v === '' ? undefined : Number(String(v).replace(',', '.'))) };

type Target = { enrollment: Enrollment; grade?: Grade } | null;

function GradeForm({ target, onClose }: { target: NonNullable<Target>; onClose: () => void }) {
  const qc = useQueryClient();
  const editing = !!target.grade;
  // Formulário montado já com os valores iniciais (key por alvo): sem reset tardio.
  const form = useForm<{ assessment: string; value: number }>({
    resolver: zodResolver(editing ? editGradeSchema.extend({ assessment: z.string() }) : newGradeSchema),
    defaultValues: { assessment: target.grade?.assessment ?? '', value: target.grade?.value ?? (undefined as unknown as number) },
  });

  const submit = form.handleSubmit(async ({ assessment, value }) => {
    try {
      if (target.grade) await api.enrollments.updateGrade(target.enrollment.id, target.grade.id, value);
      else await api.enrollments.addGrade(target.enrollment.id, { assessment, value });
      toast.success(editing ? 'Nota corrigida' : 'Nota lançada');
      qc.invalidateQueries({ queryKey: ['classroom'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ASSESSMENT_EXISTS') form.setError('assessment', { message: err.message });
      else toast.error(errorMessage(err));
    }
  });

  const e = form.formState.errors;
  return (
    <form onSubmit={submit} noValidate aria-label="Nota">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Avaliação" error={e.assessment?.message} hint={editing ? undefined : 'Ex.: P1, P2, Trabalho'}>
          {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} disabled={editing} className="uppercase" error={e.assessment?.message} {...form.register('assessment')} />}
        </Field>
        <Field label="Nota (0 a 10)" error={e.value?.message}>
          {({ id }) => <Input id={id} type="number" step="0.01" min={0} max={10} error={e.value?.message} {...form.register('value', num)} />}
        </Field>
      </div>
      <div className="-mx-6 mt-6 flex justify-end gap-2 border-t border-slate-100 px-6 pt-4">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" loading={form.formState.isSubmitting}>{editing ? 'Salvar nota' : 'Lançar nota'}</Button>
      </div>
    </form>
  );
}

function GradeDialog({ target, onClose }: { target: Target; onClose: () => void }) {
  return (
    <Dialog
      open={!!target}
      onClose={onClose}
      title={target?.grade ? `Corrigir nota ${target.grade.assessment}` : 'Lançar nota'}
      description={target && <>Aluno(a): <strong>{target.enrollment.student.name}</strong></>}
    >
      {target && <GradeForm key={`${target.enrollment.id}:${target.grade?.id ?? 'new'}`} target={target} onClose={onClose} />}
    </Dialog>
  );
}

export default function ClassroomPage() {
  const { id = '' } = useParams();
  const [target, setTarget] = useState<Target>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const course = useQuery({ queryKey: ['courses', 'detail', id], queryFn: () => api.courses.get(id) });
  const rows = useQuery({ queryKey: ['classroom', id], queryFn: () => api.courses.enrollments(id) });

  if (course.isError) return <Container className="py-10"><ErrorState message={errorMessage(course.error)} /></Container>;
  if (!course.data || !rows.data) return <Container className="py-10"><Spinner /></Container>;

  const list = rows.data.filter((e) => showCancelled || e.status === 'ACTIVE');
  const cancelledCount = rows.data.filter((e) => e.status === 'CANCELLED').length;

  return (
    <Container className="py-10">
      <Link to={`/professor/cursos/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800"><ArrowLeft className="size-4" aria-hidden /> Voltar ao curso</Link>
      <PageHeader
        title={`Turma — ${course.data.title}`}
        eyebrow={<StatusBadge status={course.data.status} />}
        description={`${course.data.enrolledCount} aluno(s) ativo(s) de ${course.data.capacity} vagas · ${course.data.lessonsCount} aulas`}
      />
      <div className="mb-4 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" className="size-4 rounded border-slate-300 text-brand-600" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
          Mostrar matrículas canceladas ({cancelledCount})
        </label>
      </div>
      <Card className="overflow-x-auto">
        {list.length === 0 ? (
          <EmptyState title="Nenhum aluno matriculado" description="Quando alunos se matricularem, eles aparecerão aqui." />
        ) : (
          <table className="w-full text-sm" aria-label="Alunos da turma">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium">Aluno</th>
                <th scope="col" className="px-6 py-3 font-medium">Progresso</th>
                <th scope="col" className="px-6 py-3 font-medium">Notas</th>
                <th scope="col" className="px-6 py-3 font-medium">Média</th>
                <th scope="col" className="px-6 py-3 font-medium">Situação</th>
                <th scope="col" className="px-6 py-3"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((e) => {
                const locked = !!e.certificate;
                const active = e.status === 'ACTIVE';
                return (
                  <tr key={e.id} data-testid="student-row" className={active ? '' : 'opacity-60'}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={e.student.name} size="sm" />
                        <div><p className="font-medium text-slate-900">{e.student.name}</p><p className="text-xs text-slate-500">{e.student.email}</p></div>
                      </div>
                    </td>
                    <td className="w-44 px-6 py-4">
                      <p className="mb-1 text-xs text-slate-500">{e.progress.percent}% · {e.progress.completedLessons}/{e.progress.totalLessons}</p>
                      <ProgressBar value={e.progress.percent} label={`Progresso de ${e.student.name}`} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {e.grades.length === 0 && <span className="text-slate-400">—</span>}
                        {e.grades.map((g) => (
                          <button key={g.id} disabled={locked || !active} onClick={() => setTarget({ enrollment: e, grade: g })}
                            className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-default disabled:hover:bg-slate-100 disabled:hover:text-slate-700"
                            aria-label={`Corrigir ${g.assessment} de ${e.student.name} (nota ${formatGrade(g.value)})`}>
                            {g.assessment}: {formatGrade(g.value)}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{formatGrade(e.average)}</td>
                    <td className="px-6 py-4"><SituationBadge situation={e.situation} /></td>
                    <td className="px-6 py-4 text-right">
                      {locked ? (
                        <Badge tone="brand" icon={<Lock className="size-3" aria-hidden />}>Certificado emitido</Badge>
                      ) : active ? (
                        <Button size="sm" variant="secondary" onClick={() => setTarget({ enrollment: e })} aria-label={`Lançar nota para ${e.student.name}`}>
                          <Plus className="size-4" aria-hidden /> Nota
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
      <GradeDialog target={target} onClose={() => setTarget(null)} />
    </Container>
  );
}
