import { AcademicPolicy, average, progressPercent, situationOf } from '../../domain/academic-policy';
import { Enrollment } from './enrollment.entity';

export function presentEnrollment(e: Enrollment, totalLessons: number) {
  const grades = [...(e.grades ?? [])].sort((a, b) => a.assessment.localeCompare(b.assessment, 'pt-BR', { numeric: true }));
  const completedLessonIds = (e.progress ?? []).map((p) => p.lesson.id);
  const progress = progressPercent(completedLessonIds.length, totalLessons);
  const values = grades.map((g) => g.value);

  return {
    id: e.id,
    status: e.status,
    createdAt: e.createdAt,
    cancelledAt: e.cancelledAt,
    student: { id: e.student.id, name: e.student.name, email: e.student.email },
    course: {
      id: e.course.id,
      title: e.course.title,
      slug: e.course.slug,
      status: e.course.status,
      workloadHours: e.course.workloadHours,
      category: { name: e.course.category.name, slug: e.course.category.slug },
      teacher: { id: e.course.teacher.id, name: e.course.teacher.name },
    },
    progress: { completedLessons: completedLessonIds.length, totalLessons, percent: progress, completedLessonIds },
    grades: grades.map((g) => ({ id: g.id, assessment: g.assessment, value: g.value, updatedAt: g.updatedAt })),
    average: average(values),
    situation: situationOf({ status: e.status, grades: values, progress }),
    certificate: e.certificate ? { code: e.certificate.code, issuedAt: e.certificate.issuedAt } : null,
    policy: {
      minAssessments: AcademicPolicy.MIN_ASSESSMENTS,
      passingAverage: AcademicPolicy.PASSING_AVERAGE,
      minProgressPercent: AcademicPolicy.MIN_PROGRESS_PERCENT,
    },
  };
}
export type EnrollmentView = ReturnType<typeof presentEnrollment>;
