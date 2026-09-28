import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { AuthUser } from '../../common/auth/decorators';
import { BusinessRule, Conflict, Forbidden, NotFound } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { AcademicSituation, CourseStatus, EnrollmentStatus, Role } from '../../domain/enums';
import { Certificate } from '../certificates/certificate.entity';
import { Course } from '../courses/course.entity';
import { CoursesService } from '../courses/courses.service';
import { Lesson } from '../lessons/lesson.entity';
import { CreateGradeDto, ListMyEnrollmentsQuery, UpdateGradeDto } from './enrollments.dto';
import { Enrollment } from './enrollment.entity';
import { presentEnrollment } from './enrollment.presenter';
import { Grade } from './grade.entity';
import { LessonProgress } from './lesson-progress.entity';

const RELATIONS = { grades: true, progress: { lesson: true }, certificate: true } as const;
const isUniqueViolation = (e: unknown) => e instanceof QueryFailedError && (e as unknown as { code?: string }).code === '23505';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @InjectRepository(Enrollment) private readonly enrollments: Repository<Enrollment>,
    @InjectRepository(Grade) private readonly grades: Repository<Grade>,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(LessonProgress) private readonly progress: Repository<LessonProgress>,
    @InjectRepository(Certificate) private readonly certificates: Repository<Certificate>,
    private readonly courses: CoursesService,
  ) {}

  /**
   * Matrícula com trava pessimista na linha do curso: duas requisições simultâneas
   * pela última vaga são serializadas, e só uma passa.
   */
  async enroll(courseId: string, student: AuthUser) {
    try {
      const id = await this.ds.transaction(async (tx) => {
        const course = await tx.getRepository(Course)
          .createQueryBuilder('c').setLock('pessimistic_write').where('c.id = :id', { id: courseId }).getOne();
        if (!course || course.status === CourseStatus.DRAFT) throw NotFound('Curso');
        if (course.status !== CourseStatus.PUBLISHED) {
          throw BusinessRule(ErrorCode.COURSE_NOT_OPEN, 'Este curso não está aberto para matrículas');
        }
        const repo = tx.getRepository(Enrollment);
        const already = await repo.exists({ where: { course: { id: courseId }, student: { id: student.id }, status: EnrollmentStatus.ACTIVE } });
        if (already) throw Conflict(ErrorCode.ALREADY_ENROLLED, 'Você já está matriculado neste curso');
        const active = await repo.count({ where: { course: { id: courseId }, status: EnrollmentStatus.ACTIVE } });
        if (active >= course.capacity) throw Conflict(ErrorCode.COURSE_FULL, 'Não há vagas disponíveis neste curso');
        const saved = await repo.save(repo.create({ course: { id: courseId }, student: { id: student.id } }));
        return saved.id;
      });
      return this.view(id);
    } catch (e) {
      if (isUniqueViolation(e)) throw Conflict(ErrorCode.ALREADY_ENROLLED, 'Você já está matriculado neste curso');
      throw e;
    }
  }

  async mine(student: AuthUser, q: ListMyEnrollmentsQuery) {
    const rows = await this.enrollments.find({
      where: { student: { id: student.id }, ...(q.status ? { status: q.status } : {}) },
      relations: RELATIONS,
      order: { createdAt: 'DESC' },
    });
    const totals = await this.lessonTotals(rows.map((r) => r.course.id));
    return rows.map((e) => presentEnrollment(e, totals.get(e.course.id) ?? 0));
  }

  async detail(id: string, viewer: AuthUser) {
    const e = await this.load(id);
    const allowed = viewer.role === Role.ADMIN || e.student.id === viewer.id || e.course.teacher.id === viewer.id;
    if (!allowed) throw Forbidden('Você não tem acesso a esta matrícula');
    return this.present(e);
  }

  async byCourse(courseId: string, actor: AuthUser) {
    await this.courses.getManageable(courseId, actor);
    const rows = await this.enrollments.find({
      where: { course: { id: courseId } }, relations: RELATIONS, order: { status: 'ASC', createdAt: 'ASC' },
    });
    const total = await this.lessons.count({ where: { course: { id: courseId } } });
    return rows.map((e) => presentEnrollment(e, total));
  }

  async cancel(id: string, actor: AuthUser) {
    const e = await this.load(id);
    if (actor.role !== Role.ADMIN && e.student.id !== actor.id) throw Forbidden('Esta matrícula pertence a outro aluno');
    if (e.status !== EnrollmentStatus.ACTIVE) throw BusinessRule(ErrorCode.ENROLLMENT_NOT_ACTIVE, 'Esta matrícula já está cancelada');
    if (e.grades.length > 0) throw BusinessRule(ErrorCode.ENROLLMENT_HAS_GRADES, 'Matrículas com notas lançadas não podem ser canceladas');
    e.status = EnrollmentStatus.CANCELLED;
    e.cancelledAt = new Date();
    await this.enrollments.save(e);
    return this.view(id);
  }

  /** Idempotente: concluir uma aula já concluída não gera erro nem duplica. */
  async completeLesson(id: string, lessonId: string, student: AuthUser) {
    const e = await this.load(id);
    if (e.student.id !== student.id) throw Forbidden('Esta matrícula pertence a outro aluno');
    if (e.status !== EnrollmentStatus.ACTIVE) throw BusinessRule(ErrorCode.ENROLLMENT_NOT_ACTIVE, 'Matrícula não está ativa');
    const lesson = await this.lessons.findOne({ where: { id: lessonId, course: { id: e.course.id } } });
    if (!lesson) throw NotFound('Aula');
    await this.progress.createQueryBuilder().insert().into(LessonProgress)
      .values({ enrollment: { id }, lesson: { id: lessonId } }).orIgnore().execute();
    return this.view(id);
  }

  async undoLesson(id: string, lessonId: string, student: AuthUser) {
    const e = await this.load(id);
    if (e.student.id !== student.id) throw Forbidden('Esta matrícula pertence a outro aluno');
    if (e.status !== EnrollmentStatus.ACTIVE) throw BusinessRule(ErrorCode.ENROLLMENT_NOT_ACTIVE, 'Matrícula não está ativa');
    if (e.certificate) throw BusinessRule(ErrorCode.GRADES_LOCKED, 'Certificado já emitido: o progresso não pode mais ser alterado');
    await this.progress.delete({ enrollment: { id }, lesson: { id: lessonId } });
    return this.view(id);
  }

  async addGrade(id: string, dto: CreateGradeDto, actor: AuthUser) {
    const e = await this.gradable(id, actor);
    if (e.grades.some((g) => g.assessment === dto.assessment)) {
      throw Conflict(ErrorCode.ASSESSMENT_EXISTS, `A avaliação ${dto.assessment} já foi lançada para este aluno`);
    }
    try {
      await this.grades.save(this.grades.create({ enrollment: { id }, assessment: dto.assessment, value: dto.value }));
    } catch (err) {
      if (isUniqueViolation(err)) throw Conflict(ErrorCode.ASSESSMENT_EXISTS, `A avaliação ${dto.assessment} já foi lançada para este aluno`);
      throw err;
    }
    return this.view(id);
  }

  async updateGrade(id: string, gradeId: string, dto: UpdateGradeDto, actor: AuthUser) {
    const e = await this.gradable(id, actor);
    const grade = e.grades.find((g) => g.id === gradeId);
    if (!grade) throw NotFound('Nota');
    grade.value = dto.value;
    await this.grades.save(grade);
    return this.view(id);
  }

  /** Idempotente: se já existe certificado, devolve o mesmo (created=false). */
  async issueCertificate(id: string, student: AuthUser) {
    const e = await this.load(id);
    if (e.student.id !== student.id) throw Forbidden('Esta matrícula pertence a outro aluno');
    if (e.certificate) return { created: false, certificate: e.certificate };

    const view = await this.present(e);
    if (view.situation !== AcademicSituation.APPROVED) {
      throw BusinessRule(ErrorCode.NOT_APPROVED, 'O certificado só pode ser emitido após a aprovação no curso');
    }
    const certificate = await this.certificates.save(
      this.certificates.create({
        enrollment: { id },
        code: await this.newCode(),
        studentName: e.student.name,
        courseTitle: e.course.title,
        teacherName: e.course.teacher.name,
        workloadHours: e.course.workloadHours,
        finalAverage: view.average!,
      }),
    );
    return { created: true, certificate };
  }

  // ---------- helpers ----------

  private async gradable(id: string, actor: AuthUser) {
    const e = await this.load(id);
    if (actor.role !== Role.ADMIN && e.course.teacher.id !== actor.id) {
      throw Forbidden('Apenas o professor responsável pelo curso pode lançar notas');
    }
    if (e.status !== EnrollmentStatus.ACTIVE) throw BusinessRule(ErrorCode.ENROLLMENT_NOT_ACTIVE, 'Não é possível lançar notas em matrícula cancelada');
    if (e.certificate) throw BusinessRule(ErrorCode.GRADES_LOCKED, 'Certificado já emitido: as notas estão bloqueadas');
    return e;
  }

  private async load(id: string) {
    const e = await this.enrollments.findOne({ where: { id }, relations: RELATIONS });
    if (!e) throw NotFound('Matrícula');
    return e;
  }

  private async present(e: Enrollment) {
    const total = await this.lessons.count({ where: { course: { id: e.course.id } } });
    return presentEnrollment(e, total);
  }

  private async view(id: string) {
    return this.present(await this.load(id));
  }

  private async lessonTotals(courseIds: string[]) {
    const map = new Map<string, number>();
    if (!courseIds.length) return map;
    const rows: { course_id: string; n: number }[] = await this.ds.query(
      `SELECT course_id, COUNT(*)::int AS n FROM lessons WHERE course_id = ANY($1) GROUP BY course_id`, [courseIds],
    );
    rows.forEach((r) => map.set(r.course_id, r.n));
    return map;
  }

  private async newCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I para evitar confusão ao digitar
    for (;;) {
      const bytes = randomBytes(8);
      const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
      const code = `EDU-${chars.slice(0, 4)}-${chars.slice(4)}`;
      if (!(await this.certificates.exists({ where: { code } }))) return code;
    }
  }
}
