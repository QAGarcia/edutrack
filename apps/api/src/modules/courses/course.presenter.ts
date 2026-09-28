import { Course } from './course.entity';
import { CourseStats } from './course-stats';

export function presentCourse(c: Course, s: CourseStats) {
  return {
    id: c.id,
    title: c.title,
    slug: c.slug,
    summary: c.summary,
    level: c.level,
    status: c.status,
    workloadHours: c.workloadHours,
    capacity: c.capacity,
    enrolledCount: s.enrolledCount,
    seatsLeft: Math.max(c.capacity - s.enrolledCount, 0),
    lessonsCount: s.lessonsCount,
    totalMinutes: s.totalMinutes,
    category: { id: c.category.id, name: c.category.name, slug: c.category.slug },
    teacher: { id: c.teacher.id, name: c.teacher.name },
    publishedAt: c.publishedAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}
export type CourseView = ReturnType<typeof presentCourse>;
