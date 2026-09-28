import { Controller, Get, Injectable } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminDashboardResponse, TeacherDashboardResponse } from '../../common/http/responses';
import { ApiErrors, E } from '../../common/http/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthUser, CurrentUser, Roles } from '../../common/auth/decorators';
import { AcademicPolicy } from '../../domain/academic-policy';
import { Role } from '../../domain/enums';

const toMap = (rows: { k: string; n: number }[]) => Object.fromEntries(rows.map((r) => [r.k, r.n]));

@Injectable()
export class DashboardService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async admin() {
    const q = (sql: string, p: unknown[] = []) => this.ds.query(sql, p);
    const [users, courses, [enr], [certs], top, recent] = await Promise.all([
      q(`SELECT role AS k, COUNT(*)::int AS n FROM users WHERE is_active GROUP BY role`),
      q(`SELECT status AS k, COUNT(*)::int AS n FROM courses GROUP BY status`),
      q(`SELECT COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active, COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled FROM enrollments`),
      q(`SELECT COUNT(*)::int AS n FROM certificates`),
      q(`SELECT c.id, c.title, c.capacity, COUNT(e.id)::int AS enrolled
           FROM courses c LEFT JOIN enrollments e ON e.course_id = c.id AND e.status = 'ACTIVE'
          WHERE c.status = 'PUBLISHED' GROUP BY c.id ORDER BY enrolled DESC, c.title ASC LIMIT 5`),
      q(`SELECT e.id, e.created_at AS "createdAt", u.name AS "studentName", c.title AS "courseTitle"
           FROM enrollments e JOIN users u ON u.id = e.student_id JOIN courses c ON c.id = e.course_id
          ORDER BY e.created_at DESC LIMIT 6`),
    ]);
    return {
      activeUsers: { ADMIN: 0, TEACHER: 0, STUDENT: 0, ...toMap(users) },
      courses: { DRAFT: 0, PUBLISHED: 0, ARCHIVED: 0, ...toMap(courses) },
      enrollments: enr,
      certificatesIssued: certs.n,
      topCourses: top,
      recentEnrollments: recent,
    };
  }

  async teacher(user: AuthUser) {
    const q = (sql: string) => this.ds.query(sql, [user.id]);
    const [courses, [students], [avg], [pending], top] = await Promise.all([
      q(`SELECT status AS k, COUNT(*)::int AS n FROM courses WHERE teacher_id = $1 GROUP BY status`),
      q(`SELECT COUNT(DISTINCT e.student_id)::int AS n FROM enrollments e JOIN courses c ON c.id = e.course_id
          WHERE c.teacher_id = $1 AND e.status = 'ACTIVE'`),
      q(`SELECT ROUND(AVG(g.value), 2)::float AS n FROM grades g JOIN enrollments e ON e.id = g.enrollment_id
           JOIN courses c ON c.id = e.course_id WHERE c.teacher_id = $1`),
      q(`SELECT COUNT(*)::int AS n FROM enrollments e JOIN courses c ON c.id = e.course_id
          WHERE c.teacher_id = $1 AND e.status = 'ACTIVE'
            AND (SELECT COUNT(*) FROM grades g WHERE g.enrollment_id = e.id) < ${AcademicPolicy.MIN_ASSESSMENTS}`),
      q(`SELECT c.id, c.title, c.status, c.capacity, COUNT(e.id)::int AS enrolled
           FROM courses c LEFT JOIN enrollments e ON e.course_id = c.id AND e.status = 'ACTIVE'
          WHERE c.teacher_id = $1 GROUP BY c.id ORDER BY enrolled DESC, c.title ASC LIMIT 5`),
    ]);
    return {
      courses: { DRAFT: 0, PUBLISHED: 0, ARCHIVED: 0, ...toMap(courses) },
      activeStudents: students.n,
      averageGrade: avg.n,
      enrollmentsPendingGrades: pending.n,
      topCourses: top,
    };
  }
}

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('admin') @Roles(Role.ADMIN) @ApiOperation({ summary: 'Indicadores gerais da plataforma', description: 'RN55. Somente admin.' })
  @ApiOkResponse({ type: AdminDashboardResponse })
  @ApiErrors(E.unauthorized, E.forbidden)
  admin() {
    return this.service.admin();
  }

  @Get('teacher') @Roles(Role.TEACHER) @ApiOperation({ summary: 'Indicadores do professor logado', description: 'RN56. Somente professor.' })
  @ApiOkResponse({ type: TeacherDashboardResponse })
  @ApiErrors(E.unauthorized, E.forbidden)
  teacher(@CurrentUser() user: AuthUser) {
    return this.service.teacher(user);
  }
}
