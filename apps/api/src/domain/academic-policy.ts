import { AcademicSituation, EnrollmentStatus } from './enums';

/** Regras acadêmicas centralizadas: um único lugar para mudar e testar. */
export const AcademicPolicy = {
  MIN_ASSESSMENTS: 2,
  PASSING_AVERAGE: 6,
  MIN_PROGRESS_PERCENT: 75,
  MIN_GRADE: 0,
  MAX_GRADE: 10,
} as const;

export function average(values: number[]): number | null {
  if (!values.length) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

export function progressPercent(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

export function situationOf(input: {
  status: EnrollmentStatus;
  grades: number[];
  progress: number;
}): AcademicSituation {
  if (input.status === EnrollmentStatus.CANCELLED) return AcademicSituation.CANCELLED;
  if (input.grades.length < AcademicPolicy.MIN_ASSESSMENTS) return AcademicSituation.IN_PROGRESS;
  const avg = average(input.grades)!;
  if (avg < AcademicPolicy.PASSING_AVERAGE) return AcademicSituation.FAILED;
  if (input.progress < AcademicPolicy.MIN_PROGRESS_PERCENT) return AcademicSituation.IN_PROGRESS;
  return AcademicSituation.APPROVED;
}
