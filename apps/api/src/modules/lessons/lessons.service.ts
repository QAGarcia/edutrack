import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthUser } from '../../common/auth/decorators';
import { BusinessRule, Forbidden, NotFound } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { CourseStatus, EnrollmentStatus, Role } from '../../domain/enums';
import { CoursesService } from '../courses/courses.service';
import { CreateLessonDto, ReorderLessonsDto, UpdateLessonDto } from '../courses/courses.dto';
import { Enrollment } from '../enrollments/enrollment.entity';
import { LessonProgress } from '../enrollments/lesson-progress.entity';
import { Lesson } from './lesson.entity';

@Injectable()
export class LessonsService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(Enrollment) private readonly enrollments: Repository<Enrollment>,
    @InjectRepository(LessonProgress) private readonly progress: Repository<LessonProgress>,
    private readonly courses: CoursesService,
  ) {}

  /** Conteúdo completo da aula: dono/admin ou aluno com matrícula ativa. */
  async get(courseId: string, lessonId: string, viewer: AuthUser) {
    const lesson = await this.lessons.findOne({ where: { id: lessonId, course: { id: courseId } }, relations: { course: true } });
    if (!lesson) throw NotFound('Aula');

    let completed = false;
    const isStaff = viewer.role === Role.ADMIN || lesson.course.teacher.id === viewer.id;
    if (!isStaff) {
      const enrollment = await this.enrollments.findOne({
        where: { course: { id: courseId }, student: { id: viewer.id }, status: EnrollmentStatus.ACTIVE },
      });
      if (!enrollment) throw Forbidden('Matricule-se no curso para acessar o conteúdo das aulas');
      completed = await this.progress.exists({ where: { enrollment: { id: enrollment.id }, lesson: { id: lessonId } } });
    }
    return this.present(lesson, completed);
  }

  async create(courseId: string, dto: CreateLessonDto, actor: AuthUser) {
    const course = await this.editableCourse(courseId, actor);
    const { max } = await this.lessons
      .createQueryBuilder('l').select('COALESCE(MAX(l.position), 0)', 'max').where('l.course_id = :id', { id: courseId })
      .getRawOne<{ max: number }>() ?? { max: 0 };
    const lesson = await this.lessons.save(
      this.lessons.create({ ...dto, content: dto.content ?? '', course, position: Number(max) + 1 }),
    );
    return this.present(lesson);
  }

  async update(courseId: string, lessonId: string, dto: UpdateLessonDto, actor: AuthUser) {
    await this.editableCourse(courseId, actor);
    const lesson = await this.lessons.findOne({ where: { id: lessonId, course: { id: courseId } } });
    if (!lesson) throw NotFound('Aula');
    Object.assign(lesson, dto);
    return this.present(await this.lessons.save(lesson));
  }

  async remove(courseId: string, lessonId: string, actor: AuthUser) {
    const course = await this.editableCourse(courseId, actor);
    const lesson = await this.lessons.findOne({ where: { id: lessonId, course: { id: courseId } } });
    if (!lesson) throw NotFound('Aula');
    const count = await this.lessons.count({ where: { course: { id: courseId } } });
    if (course.status === CourseStatus.PUBLISHED && count === 1) {
      throw BusinessRule(ErrorCode.LAST_LESSON_OF_PUBLISHED_COURSE, 'Um curso publicado precisa ter ao menos uma aula');
    }
    await this.ds.transaction(async (tx) => {
      await tx.delete(Lesson, { id: lessonId });
      // Mantém posições contíguas (1..n) depois da exclusão.
      await tx.query(`UPDATE lessons SET position = position - 1 WHERE course_id = $1 AND position > $2`, [courseId, lesson.position]);
    });
  }

  async reorder(courseId: string, dto: ReorderLessonsDto, actor: AuthUser) {
    await this.editableCourse(courseId, actor);
    const current = await this.lessons.find({ where: { course: { id: courseId } }, select: { id: true } });
    const same = current.length === dto.lessonIds.length && new Set(dto.lessonIds).size === current.length
      && current.every((l) => dto.lessonIds.includes(l.id));
    if (!same) throw BusinessRule(ErrorCode.INVALID_LESSON_ORDER, 'Envie todos os IDs das aulas do curso, sem repetir');
    await this.ds.transaction(async (tx) => {
      for (const [i, id] of dto.lessonIds.entries()) await tx.update(Lesson, { id }, { position: i + 1 });
    });
    const lessons = await this.lessons.find({ where: { course: { id: courseId } }, order: { position: 'ASC' } });
    return lessons.map((l) => this.present(l));
  }

  private async editableCourse(courseId: string, actor: AuthUser) {
    const course = await this.courses.getManageable(courseId, actor);
    if (course.status === CourseStatus.ARCHIVED) throw BusinessRule(ErrorCode.COURSE_NOT_EDITABLE, 'Cursos arquivados não podem ser alterados');
    return course;
  }

  private present(l: Lesson, completed?: boolean) {
    return {
      id: l.id, title: l.title, content: l.content, durationMinutes: l.durationMinutes, position: l.position,
      ...(completed !== undefined ? { completed } : {}),
      updatedAt: l.updatedAt,
    };
  }
}
