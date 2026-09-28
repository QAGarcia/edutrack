import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { average } from '../../domain/academic-policy';
import { EnrollmentStatus } from '../../domain/enums';
import { slugify } from '../../common/slug';
import { Category, Certificate, Course, Enrollment, Grade, Lesson, LessonProgress, User } from '../entities';
import { CATEGORIES, COURSES, DEFAULT_PASSWORD, ENROLLMENTS, USERS, lessonContent } from './seed-data';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

/** Zera todas as tabelas e recria uma massa conhecida. Determinístico, exceto IDs e datas relativas. */
export async function seed(ds: DataSource) {
  return ds.transaction(async (tx) => {
    await tx.query(
      'TRUNCATE TABLE certificates, grades, lesson_progress, enrollments, lessons, courses, categories, users RESTART IDENTITY CASCADE',
    );

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const categories = new Map<string, Category>();
    for (const name of CATEGORIES) {
      categories.set(name, await tx.save(Category, tx.create(Category, { name, slug: slugify(name) })));
    }

    const users = new Map<string, User>();
    for (const [i, u] of USERS.entries()) {
      const created = tx.create(User, {
        name: u.name, email: u.email, role: u.role, bio: u.bio ?? '', isActive: u.isActive ?? true, passwordHash,
        createdAt: daysAgo(400 - i),
      });
      users.set(u.key, await tx.save(User, created));
    }

    const courses = new Map<string, Course>();
    const lessonsByCourse = new Map<string, Lesson[]>();
    for (const c of COURSES) {
      const course = await tx.save(Course, tx.create(Course, {
        title: c.title, slug: slugify(c.title), summary: c.summary,
        description: `${c.summary}\n\nAo final do curso você terá aplicado cada conceito em exercícios práticos. Carga horária de ${c.workloadHours} horas, com certificado para quem for aprovado.`,
        level: c.level, workloadHours: c.workloadHours, capacity: c.capacity, status: c.status,
        category: categories.get(c.category)!, teacher: users.get(c.teacher)!,
        createdAt: daysAgo(c.daysAgo), updatedAt: daysAgo(c.daysAgo),
        publishedAt: c.status === 'DRAFT' ? null : daysAgo(c.daysAgo - 0.5),
      }));
      courses.set(c.key, course);
      const lessons: Lesson[] = [];
      for (const [i, [title, minutes]] of c.lessons.entries()) {
        lessons.push(await tx.save(Lesson, tx.create(Lesson, {
          course, title, durationMinutes: minutes, position: i + 1, content: lessonContent(c.title, title),
        })));
      }
      lessonsByCourse.set(c.key, lessons);
    }

    for (const e of ENROLLMENTS) {
      const student = users.get(e.student)!;
      const course = courses.get(e.course)!;
      const enrollment = await tx.save(Enrollment, tx.create(Enrollment, {
        student, course,
        status: e.cancelled ? EnrollmentStatus.CANCELLED : EnrollmentStatus.ACTIVE,
        createdAt: daysAgo(e.daysAgo),
        cancelledAt: e.cancelled ? daysAgo(e.daysAgo - 1) : null,
      }));
      const lessons = lessonsByCourse.get(e.course)!;
      const done = e.completedLessons === 'all' ? lessons.length : e.completedLessons;
      for (const lesson of lessons.slice(0, done)) {
        await tx.save(LessonProgress, tx.create(LessonProgress, { enrollment, lesson }));
      }
      for (const [assessment, value] of e.grades ?? []) {
        await tx.save(Grade, tx.create(Grade, { enrollment, assessment, value }));
      }
      if (e.certificate) {
        await tx.save(Certificate, tx.create(Certificate, {
          enrollment,
          code: `EDU-${e.student.slice(0, 4).toUpperCase().padEnd(4, 'X')}-${e.course.slice(0, 4).toUpperCase().padEnd(4, 'X')}`,
          studentName: student.name, courseTitle: course.title, teacherName: course.teacher.name,
          workloadHours: course.workloadHours, finalAverage: average((e.grades ?? []).map(([, v]) => v))!,
          issuedAt: daysAgo(e.daysAgo - 20),
        }));
      }
    }

    return {
      password: DEFAULT_PASSWORD,
      counts: { users: users.size, categories: categories.size, courses: courses.size, enrollments: ENROLLMENTS.length },
      users: USERS.map((u) => ({ email: u.email, role: u.role, active: u.isActive ?? true })),
    };
  });
}
