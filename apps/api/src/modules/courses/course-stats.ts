import { DataSource } from 'typeorm';
import { EnrollmentStatus } from '../../domain/enums';

export interface CourseStats {
  enrolledCount: number;
  lessonsCount: number;
  totalMinutes: number;
}

/** Busca contagens de vários cursos em 2 queries (evita N+1). */
export async function loadCourseStats(ds: DataSource, ids: string[]): Promise<Map<string, CourseStats>> {
  const map = new Map<string, CourseStats>(ids.map((id) => [id, { enrolledCount: 0, lessonsCount: 0, totalMinutes: 0 }]));
  if (!ids.length) return map;

  const enrolled: { course_id: string; n: number }[] = await ds.query(
    `SELECT course_id, COUNT(*)::int AS n FROM enrollments WHERE status = $1 AND course_id = ANY($2) GROUP BY course_id`,
    [EnrollmentStatus.ACTIVE, ids],
  );
  const lessons: { course_id: string; n: number; minutes: number }[] = await ds.query(
    `SELECT course_id, COUNT(*)::int AS n, COALESCE(SUM(duration_minutes), 0)::int AS minutes
       FROM lessons WHERE course_id = ANY($1) GROUP BY course_id`,
    [ids],
  );
  for (const r of enrolled) map.get(r.course_id)!.enrolledCount = r.n;
  for (const r of lessons) Object.assign(map.get(r.course_id)!, { lessonsCount: r.n, totalMinutes: r.minutes });
  return map;
}
