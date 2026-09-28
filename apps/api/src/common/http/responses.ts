/**
 * Modelos de RESPOSTA usados apenas pela documentação OpenAPI.
 * Eles espelham exatamente os "presenters" de cada módulo.
 */
import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { AcademicSituation, CourseLevel, CourseStatus, EnrollmentStatus, Role } from '../../domain/enums';

const dt = { type: String, format: 'date-time' } as const;

// ---------- usuários e sessão ----------
export class UserResponse {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'João Pereira' }) name: string;
  @ApiProperty({ example: 'aluno@edutrack.dev' }) email: string;
  @ApiProperty({ enum: Role, enumName: 'Role' }) role: Role;
  @ApiProperty({ example: '', maxLength: 300 }) bio: string;
  @ApiProperty() isActive: boolean;
  @ApiProperty(dt) createdAt: string;
}

export class SessionResponse {
  @ApiProperty({ description: 'JWT para o header Authorization: Bearer <token>' }) accessToken: string;
  @ApiProperty({ example: 'Bearer' }) tokenType: string;
  @ApiProperty({ type: UserResponse }) user: UserResponse;
}

// ---------- categorias ----------
export class CategoryResponse {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'Tecnologia' }) name: string;
  @ApiProperty({ example: 'tecnologia' }) slug: string;
  @ApiProperty({ example: 2, description: 'Quantidade de cursos publicados' }) publishedCourses: number;
}

export class CategoryCreatedResponse {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'Ciência de Dados' }) name: string;
  @ApiProperty({ example: 'ciencia-de-dados' }) slug: string;
  @ApiProperty(dt) createdAt: string;
}

// ---------- cursos ----------
export class CategoryRef {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'Tecnologia' }) name: string;
  @ApiProperty({ example: 'tecnologia' }) slug: string;
}

export class CategorySlugRef {
  @ApiProperty({ example: 'Tecnologia' }) name: string;
  @ApiProperty({ example: 'tecnologia' }) slug: string;
}

export class PersonRef {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'Marina Lopes' }) name: string;
}

export class TeacherProfileRef extends PersonRef {
  @ApiProperty({ example: 'Engenheira de qualidade há 12 anos.' }) bio: string;
}

export class CourseSummaryResponse {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'Playwright com TypeScript do Zero' }) title: string;
  @ApiProperty({ example: 'playwright-com-typescript-do-zero' }) slug: string;
  @ApiProperty({ example: 'Automação de testes web moderna.' }) summary: string;
  @ApiProperty({ enum: CourseLevel, enumName: 'CourseLevel' }) level: CourseLevel;
  @ApiProperty({ enum: CourseStatus, enumName: 'CourseStatus' }) status: CourseStatus;
  @ApiProperty({ example: 40 }) workloadHours: number;
  @ApiProperty({ example: 50 }) capacity: number;
  @ApiProperty({ example: 2, description: 'Matrículas ativas' }) enrolledCount: number;
  @ApiProperty({ example: 48 }) seatsLeft: number;
  @ApiProperty({ example: 6 }) lessonsCount: number;
  @ApiProperty({ example: 127, description: 'Soma da duração das aulas, em minutos' }) totalMinutes: number;
  @ApiProperty({ type: CategoryRef }) category: CategoryRef;
  @ApiProperty({ type: PersonRef }) teacher: PersonRef;
  @ApiProperty({ ...dt, nullable: true }) publishedAt: string | null;
  @ApiProperty(dt) createdAt: string;
  @ApiProperty(dt) updatedAt: string;
}

export class LessonSummaryResponse {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'Instalação e primeiro teste' }) title: string;
  @ApiProperty({ example: 18 }) durationMinutes: number;
  @ApiProperty({ example: 2, description: 'Posição 1..n dentro do curso' }) position: number;
}

export class ViewerContextResponse {
  @ApiProperty({ description: 'O usuário logado é o professor do curso' }) isOwner: boolean;
  @ApiProperty({ format: 'uuid', nullable: true, type: String, description: 'Matrícula ativa do aluno logado' }) enrollmentId: string | null;
  @ApiProperty({ description: 'Aluno logado pode se matricular agora' }) canEnroll: boolean;
}

export class CourseDetailResponse extends OmitType(CourseSummaryResponse, ['teacher'] as const) {
  @ApiProperty({ example: 'Descrição completa do curso.' }) description: string;
  @ApiProperty({ type: TeacherProfileRef }) teacher: TeacherProfileRef;
  @ApiProperty({ type: [LessonSummaryResponse] }) lessons: LessonSummaryResponse[];
  @ApiProperty({ type: ViewerContextResponse, nullable: true, description: 'null para visitante não autenticado' }) viewer: ViewerContextResponse | null;
}

export class LessonResponse extends LessonSummaryResponse {
  @ApiProperty({ example: 'Conteúdo da aula em texto.' }) content: string;
  @ApiPropertyOptional({ description: 'Presente só para alunos: se o aluno já concluiu a aula' }) completed?: boolean;
  @ApiProperty(dt) updatedAt: string;
}

// ---------- matrículas ----------
export class StudentRef extends PersonRef {
  @ApiProperty({ example: 'aluno@edutrack.dev' }) email: string;
}

export class EnrollmentCourseRef {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() title: string;
  @ApiProperty() slug: string;
  @ApiProperty({ enum: CourseStatus, enumName: 'CourseStatus' }) status: CourseStatus;
  @ApiProperty({ example: 40 }) workloadHours: number;
  @ApiProperty({ type: CategorySlugRef }) category: CategorySlugRef;
  @ApiProperty({ type: PersonRef }) teacher: PersonRef;
}

export class ProgressResponse {
  @ApiProperty({ example: 3 }) completedLessons: number;
  @ApiProperty({ example: 5 }) totalLessons: number;
  @ApiProperty({ example: 60, description: 'Inteiro de 0 a 100' }) percent: number;
  @ApiProperty({ type: [String], format: 'uuid' }) completedLessonIds: string[];
}

export class GradeResponse {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'P1' }) assessment: string;
  @ApiProperty({ example: 8.5 }) value: number;
  @ApiProperty(dt) updatedAt: string;
}

export class CertificateRef {
  @ApiProperty({ example: 'EDU-7KQ2-XM9P' }) code: string;
  @ApiProperty(dt) issuedAt: string;
}

export class AcademicPolicyResponse {
  @ApiProperty({ example: 2 }) minAssessments: number;
  @ApiProperty({ example: 6 }) passingAverage: number;
  @ApiProperty({ example: 75 }) minProgressPercent: number;
}

export class EnrollmentResponse {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ enum: EnrollmentStatus, enumName: 'EnrollmentStatus' }) status: EnrollmentStatus;
  @ApiProperty(dt) createdAt: string;
  @ApiProperty({ ...dt, nullable: true }) cancelledAt: string | null;
  @ApiProperty({ type: StudentRef }) student: StudentRef;
  @ApiProperty({ type: EnrollmentCourseRef }) course: EnrollmentCourseRef;
  @ApiProperty({ type: ProgressResponse }) progress: ProgressResponse;
  @ApiProperty({ type: [GradeResponse], description: 'Ordenadas por nome da avaliação' }) grades: GradeResponse[];
  @ApiProperty({ type: Number, nullable: true, example: 7.5, description: 'Média simples, 2 casas; null sem notas' }) average: number | null;
  @ApiProperty({
    enum: AcademicSituation,
    enumName: 'AcademicSituation',
    description: 'CANCELLED se cancelada; IN_PROGRESS com < 2 notas; FAILED se média < 6; IN_PROGRESS se progresso < 75%; senão APPROVED',
  })
  situation: AcademicSituation;
  @ApiProperty({ type: CertificateRef, nullable: true }) certificate: CertificateRef | null;
  @ApiProperty({ type: AcademicPolicyResponse }) policy: AcademicPolicyResponse;
}

// ---------- certificados ----------
export class CertificateResponse {
  @ApiProperty({ example: 'EDU-7KQ2-XM9P', pattern: '^EDU-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$' }) code: string;
  @ApiProperty({ example: 'João Pereira' }) studentName: string;
  @ApiProperty({ example: 'Playwright com TypeScript do Zero' }) courseTitle: string;
  @ApiProperty({ example: 'Marina Lopes' }) teacherName: string;
  @ApiProperty({ example: 40 }) workloadHours: number;
  @ApiProperty({ example: 8.5 }) finalAverage: number;
  @ApiProperty(dt) issuedAt: string;
}

export class CertificateVerificationResponse extends CertificateResponse {
  @ApiProperty({ example: true }) valid: boolean;
}

// ---------- painéis ----------
export class RoleCountResponse {
  @ApiProperty() ADMIN: number;
  @ApiProperty() TEACHER: number;
  @ApiProperty() STUDENT: number;
}

export class StatusCountResponse {
  @ApiProperty() DRAFT: number;
  @ApiProperty() PUBLISHED: number;
  @ApiProperty() ARCHIVED: number;
}

export class EnrollmentCountResponse {
  @ApiProperty() active: number;
  @ApiProperty() cancelled: number;
}

export class TopCourseResponse {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() title: string;
  @ApiProperty() capacity: number;
  @ApiProperty({ description: 'Matrículas ativas' }) enrolled: number;
}

export class TeacherTopCourseResponse extends TopCourseResponse {
  @ApiProperty({ enum: CourseStatus, enumName: 'CourseStatus' }) status: CourseStatus;
}

export class RecentEnrollmentResponse {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty(dt) createdAt: string;
  @ApiProperty() studentName: string;
  @ApiProperty() courseTitle: string;
}

export class AdminDashboardResponse {
  @ApiProperty({ type: RoleCountResponse, description: 'Usuários ATIVOS por perfil' }) activeUsers: RoleCountResponse;
  @ApiProperty({ type: StatusCountResponse }) courses: StatusCountResponse;
  @ApiProperty({ type: EnrollmentCountResponse }) enrollments: EnrollmentCountResponse;
  @ApiProperty() certificatesIssued: number;
  @ApiProperty({ type: [TopCourseResponse], description: 'Top 5 cursos publicados por matrículas ativas' }) topCourses: TopCourseResponse[];
  @ApiProperty({ type: [RecentEnrollmentResponse], description: '6 matrículas mais recentes' }) recentEnrollments: RecentEnrollmentResponse[];
}

export class TeacherDashboardResponse {
  @ApiProperty({ type: StatusCountResponse }) courses: StatusCountResponse;
  @ApiProperty({ description: 'Alunos distintos com matrícula ativa nos cursos do professor' }) activeStudents: number;
  @ApiProperty({ type: Number, nullable: true, example: 7.2 }) averageGrade: number | null;
  @ApiProperty({ description: 'Matrículas ativas com menos de 2 avaliações' }) enrollmentsPendingGrades: number;
  @ApiProperty({ type: [TeacherTopCourseResponse] }) topCourses: TeacherTopCourseResponse[];
}

// ---------- infraestrutura ----------
export class HealthResponse {
  @ApiProperty({ enum: ['ok', 'degraded'] }) status: string;
  @ApiProperty({ enum: ['up', 'down'] }) database: string;
  @ApiProperty({ example: '2.0.0' }) version: string;
  @ApiProperty({ example: 42 }) uptimeSeconds: number;
}

export class SeedUserResponse {
  @ApiProperty() email: string;
  @ApiProperty({ enum: Role, enumName: 'Role' }) role: Role;
  @ApiProperty() active: boolean;
}

export class SeedCountsResponse {
  @ApiProperty() users: number;
  @ApiProperty() categories: number;
  @ApiProperty() courses: number;
  @ApiProperty() enrollments: number;
}

export class ResetResponse {
  @ApiProperty({ example: 'Senha@123' }) password: string;
  @ApiProperty({ type: SeedCountsResponse }) counts: SeedCountsResponse;
  @ApiProperty({ type: [SeedUserResponse] }) users: SeedUserResponse[];
}
