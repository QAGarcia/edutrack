import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import { AuthUser } from '../../common/auth/decorators';
import { AppException, BusinessRule, Conflict, Forbidden, NotFound } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { toPage } from '../../common/http/pagination';
import { slugify } from '../../common/slug';
import { CourseStatus, EnrollmentStatus, Role } from '../../domain/enums';
import { Category } from '../categories/category.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Lesson } from '../lessons/lesson.entity';
import { Course } from './course.entity';
import { presentCourse } from './course.presenter';
import { loadCourseStats } from './course-stats';
import { CreateCourseDto, ListCoursesQuery, UpdateCourseDto } from './courses.dto';

const escapeLike = (v: string) => v.replace(/[\\%_]/g, (m) => `\\${m}`);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class CoursesService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(Enrollment) private readonly enrollments: Repository<Enrollment>,
  ) {}

  // ---------- leitura ----------

  async list(q: ListCoursesQuery, viewer?: AuthUser) {
    const qb = this.courses
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.category', 'cat')
      .innerJoinAndSelect('c.teacher', 't');

    switch (q.scope) {
      case 'catalog':
        qb.andWhere('c.status = :pub', { pub: CourseStatus.PUBLISHED });
        break;
      case 'mine':
        if (!viewer || viewer.role !== Role.TEACHER) {
          throw new AppException(HttpStatus.FORBIDDEN, ErrorCode.INVALID_SCOPE, 'scope=mine é exclusivo de professores');
        }
        qb.andWhere('t.id = :me', { me: viewer.id });
        if (q.status) qb.andWhere('c.status = :status', { status: q.status });
        break;
      case 'all':
        if (viewer?.role !== Role.ADMIN) {
          throw new AppException(HttpStatus.FORBIDDEN, ErrorCode.INVALID_SCOPE, 'scope=all é exclusivo de administradores');
        }
        if (q.status) qb.andWhere('c.status = :status', { status: q.status });
        break;
    }

    if (q.search) {
      qb.andWhere(
        new Brackets((w) =>
          w.where('unaccent_ci(c.title) LIKE unaccent_ci(:s)', { s: `%${escapeLike(q.search!)}%` }).orWhere('unaccent_ci(c.summary) LIKE unaccent_ci(:s)'),
        ),
      );
    }
    if (q.category) qb.andWhere('cat.slug = :cat', { cat: q.category });
    if (q.level) qb.andWhere('c.level = :level', { level: q.level });
    if (q.teacherId) qb.andWhere('t.id = :tid', { tid: q.teacherId });

    const activeCount = `(SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status = 'ACTIVE')`;
    switch (q.sort) {
      case 'oldest': qb.orderBy('c.createdAt', 'ASC'); break;
      case 'title': qb.orderBy('c.title', 'ASC'); break;
      case 'popular': qb.orderBy(activeCount, 'DESC'); break;
      default: qb.orderBy('c.createdAt', 'DESC');
    }
    qb.addOrderBy('c.title', 'ASC').addOrderBy('c.id', 'ASC'); // desempate estável: paginação determinística

    qb.offset((q.page - 1) * q.limit).limit(q.limit);
    const [rows, total] = await qb.getManyAndCount();
    const stats = await loadCourseStats(this.ds, rows.map((c) => c.id));
    return toPage(rows.map((c) => presentCourse(c, stats.get(c.id)!)), total, q);
  }

  async detail(idOrSlug: string, viewer?: AuthUser) {
    const course = await this.courses.findOne({ where: UUID.test(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug } });
    if (!course || !this.canView(course, viewer)) throw NotFound('Curso');

    const [stats, lessons] = await Promise.all([
      loadCourseStats(this.ds, [course.id]),
      this.lessons.find({ where: { course: { id: course.id } }, order: { position: 'ASC' } }),
    ]);
    const view = presentCourse(course, stats.get(course.id)!);

    let viewerContext: { isOwner: boolean; enrollmentId: string | null; canEnroll: boolean } | null = null;
    if (viewer) {
      const enrollment = viewer.role === Role.STUDENT
        ? await this.enrollments.findOne({ where: { course: { id: course.id }, student: { id: viewer.id }, status: EnrollmentStatus.ACTIVE } })
        : null;
      viewerContext = {
        isOwner: course.teacher.id === viewer.id,
        enrollmentId: enrollment?.id ?? null,
        canEnroll: viewer.role === Role.STUDENT && !enrollment && course.status === CourseStatus.PUBLISHED && view.seatsLeft > 0,
      };
    }

    return {
      ...view,
      description: course.description,
      teacher: { id: course.teacher.id, name: course.teacher.name, bio: course.teacher.bio },
      lessons: lessons.map((l) => ({ id: l.id, title: l.title, durationMinutes: l.durationMinutes, position: l.position })),
      viewer: viewerContext,
    };
  }

  // ---------- escrita ----------

  async create(dto: CreateCourseDto, actor: AuthUser) {
    const category = await this.categoryOrFail(dto.categoryId);
    const course = this.courses.create({
      ...dto,
      description: dto.description ?? '',
      category,
      teacher: { id: actor.id },
      slug: await this.uniqueSlug(dto.title),
      status: CourseStatus.DRAFT,
    });
    const saved = await this.courses.save(course);
    return this.detail(saved.id, actor);
  }

  async update(id: string, dto: UpdateCourseDto, actor: AuthUser) {
    const course = await this.getManageable(id, actor);
    if (course.status === CourseStatus.ARCHIVED) {
      throw BusinessRule(ErrorCode.COURSE_NOT_EDITABLE, 'Cursos arquivados não podem ser alterados');
    }
    if (dto.capacity !== undefined) {
      const active = await this.activeEnrollments(id);
      if (dto.capacity < active) {
        throw BusinessRule(ErrorCode.CAPACITY_BELOW_ENROLLED, `Vagas não podem ser menores que o número de alunos ativos (${active})`);
      }
    }
    if (dto.categoryId) course.category = await this.categoryOrFail(dto.categoryId);
    if (dto.title && dto.title !== course.title) course.slug = await this.uniqueSlug(dto.title, course.id);
    const { categoryId: _ignored, ...rest } = dto;
    Object.assign(course, rest);
    await this.courses.save(course);
    return this.detail(id, actor);
  }

  async publish(id: string, actor: AuthUser) {
    const course = await this.getManageable(id, actor);
    if (course.status !== CourseStatus.DRAFT) {
      throw BusinessRule(ErrorCode.INVALID_STATUS_TRANSITION, 'Apenas cursos em rascunho podem ser publicados');
    }
    if ((await this.lessons.count({ where: { course: { id } } })) === 0) {
      throw BusinessRule(ErrorCode.COURSE_WITHOUT_LESSONS, 'Adicione ao menos uma aula antes de publicar');
    }
    course.status = CourseStatus.PUBLISHED;
    course.publishedAt = new Date();
    await this.courses.save(course);
    return this.detail(id, actor);
  }

  async archive(id: string, actor: AuthUser) {
    const course = await this.getManageable(id, actor);
    if (course.status !== CourseStatus.PUBLISHED) {
      throw BusinessRule(ErrorCode.INVALID_STATUS_TRANSITION, 'Apenas cursos publicados podem ser arquivados');
    }
    course.status = CourseStatus.ARCHIVED;
    await this.courses.save(course);
    return this.detail(id, actor);
  }

  async remove(id: string, actor: AuthUser) {
    const course = await this.getManageable(id, actor);
    if (course.status !== CourseStatus.DRAFT) {
      throw BusinessRule(ErrorCode.INVALID_STATUS_TRANSITION, 'Apenas cursos em rascunho podem ser excluídos; arquive os demais');
    }
    if ((await this.enrollments.count({ where: { course: { id } } })) > 0) {
      throw Conflict(ErrorCode.COURSE_HAS_ENROLLMENTS, 'Curso possui matrículas e não pode ser excluído');
    }
    await this.courses.remove(course);
  }

  // ---------- helpers compartilhados ----------

  /** Dono do curso ou admin. Outros: 403 (o curso existe, mas não é seu). */
  async getManageable(id: string, actor: AuthUser): Promise<Course> {
    const course = await this.courses.findOne({ where: { id } });
    if (!course) throw NotFound('Curso');
    if (actor.role !== Role.ADMIN && course.teacher.id !== actor.id) {
      throw Forbidden('Apenas o professor responsável ou um administrador pode gerenciar este curso');
    }
    return course;
  }

  activeEnrollments(courseId: string) {
    return this.enrollments.count({ where: { course: { id: courseId }, status: EnrollmentStatus.ACTIVE } });
  }

  private canView(c: Course, viewer?: AuthUser) {
    if (c.status !== CourseStatus.DRAFT) return true; // publicados e arquivados são visíveis por link direto
    return !!viewer && (viewer.role === Role.ADMIN || c.teacher.id === viewer.id);
  }

  private async categoryOrFail(id: string) {
    const category = await this.categories.findOne({ where: { id } });
    if (!category) throw BusinessRule(ErrorCode.INVALID_CATEGORY, 'Categoria informada não existe');
    return category;
  }

  private async uniqueSlug(title: string, ignoreId?: string) {
    const base = slugify(title) || 'curso';
    let slug = base;
    for (let i = 2; ; i++) {
      const found = await this.courses.findOne({ where: { slug }, select: { id: true } });
      if (!found || found.id === ignoreId) return slug;
      slug = `${base}-${i}`;
    }
  }
}
