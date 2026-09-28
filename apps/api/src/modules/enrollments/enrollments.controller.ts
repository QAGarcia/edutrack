import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthUser, CurrentUser, Roles } from '../../common/auth/decorators';
import { ErrorCode } from '../../common/errors/error-codes';
import { CertificateResponse, EnrollmentResponse } from '../../common/http/responses';
import { ApiErrors, E } from '../../common/http/swagger';
import { UuidPipe } from '../../common/http/validation.pipe';
import { Role } from '../../domain/enums';
import { presentCertificate } from '../certificates/certificates';
import { CreateEnrollmentDto, CreateGradeDto, ListMyEnrollmentsQuery, UpdateGradeDto } from './enrollments.dto';
import { EnrollmentsService } from './enrollments.service';

const NOT_ACTIVE = ErrorCode.ENROLLMENT_NOT_ACTIVE;

@ApiTags('Enrollments')
@ApiBearerAuth()
@Controller('api')
export class EnrollmentsController {
  constructor(private readonly service: EnrollmentsService) {}

  @Post('enrollments') @Roles(Role.STUDENT)
  @ApiOperation({
    summary: 'Aluno se matricula em um curso publicado com vagas',
    description: 'RN34–RN38. O controle de vagas é seguro sob requisições simultâneas.',
  })
  @ApiCreatedResponse({ type: EnrollmentResponse })
  @ApiErrors(E.validation, E.unauthorized, [403, [ErrorCode.FORBIDDEN], 'Perfil diferente de aluno'], E.notFound('Curso inexistente ou em rascunho;'),
    [409, [ErrorCode.ALREADY_ENROLLED, ErrorCode.COURSE_FULL]], [422, [ErrorCode.COURSE_NOT_OPEN], 'Curso arquivado'])
  enroll(@Body() dto: CreateEnrollmentDto, @CurrentUser() user: AuthUser) {
    return this.service.enroll(dto.courseId, user);
  }

  @Get('enrollments/me') @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Matrículas do aluno logado (com progresso, notas e situação)', description: 'Mais recentes primeiro. Inclui matrículas canceladas, a menos que filtre por status.' })
  @ApiOkResponse({ type: [EnrollmentResponse] })
  @ApiErrors(E.validation, E.unauthorized, E.forbidden)
  mine(@CurrentUser() user: AuthUser, @Query() q: ListMyEnrollmentsQuery) {
    return this.service.mine(user, q);
  }

  @Get('enrollments/:id')
  @ApiOperation({ summary: 'Detalhe e boletim da matrícula', description: 'Aluno dono, professor do curso ou admin.' })
  @ApiOkResponse({ type: EnrollmentResponse })
  @ApiErrors(E.validation, E.unauthorized, E.forbidden, E.notFound('Matrícula'))
  detail(@Param('id', UuidPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.detail(id, user);
  }

  @Post('enrollments/:id/cancel') @HttpCode(200) @Roles(Role.STUDENT, Role.ADMIN)
  @ApiOperation({ summary: 'Cancela matrícula ativa sem notas', description: 'RN39–RN40. Depois de cancelar, o aluno pode se matricular de novo.' })
  @ApiOkResponse({ type: EnrollmentResponse })
  @ApiErrors(E.validation, E.unauthorized, [403, [ErrorCode.FORBIDDEN], 'Matrícula de outro aluno'], E.notFound('Matrícula'),
    [422, [NOT_ACTIVE, ErrorCode.ENROLLMENT_HAS_GRADES]])
  cancel(@Param('id', UuidPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.cancel(id, user);
  }

  @Post('enrollments/:id/lessons/:lessonId/complete') @HttpCode(200) @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Marca aula como concluída', description: 'RN41–RN42. Idempotente: repetir não duplica nem gera erro.' })
  @ApiOkResponse({ type: EnrollmentResponse })
  @ApiErrors(E.validation, E.unauthorized, [403, [ErrorCode.FORBIDDEN], 'Matrícula de outro aluno'], E.notFound('Matrícula ou aula'), [422, [NOT_ACTIVE]])
  complete(@Param('id', UuidPipe) id: string, @Param('lessonId', UuidPipe) lessonId: string, @CurrentUser() user: AuthUser) {
    return this.service.completeLesson(id, lessonId, user);
  }

  @Delete('enrollments/:id/lessons/:lessonId/complete') @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Desmarca aula concluída', description: 'RN41, RN43. Bloqueado depois da emissão do certificado.' })
  @ApiOkResponse({ type: EnrollmentResponse })
  @ApiErrors(E.validation, E.unauthorized, [403, [ErrorCode.FORBIDDEN], 'Matrícula de outro aluno'], E.notFound('Matrícula'),
    [422, [NOT_ACTIVE, ErrorCode.GRADES_LOCKED]])
  undo(@Param('id', UuidPipe) id: string, @Param('lessonId', UuidPipe) lessonId: string, @CurrentUser() user: AuthUser) {
    return this.service.undoLesson(id, lessonId, user);
  }

  @Post('enrollments/:id/grades') @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Lança nota de uma avaliação', description: 'RN44–RN49. Professor do curso ou admin. Nota de 0 a 10 com até 2 casas; avaliação normalizada para maiúsculas.' })
  @ApiCreatedResponse({ type: EnrollmentResponse })
  @ApiErrors(E.validation, E.unauthorized, [403, [ErrorCode.FORBIDDEN], 'Professor de outro curso'], E.notFound('Matrícula'),
    [409, [ErrorCode.ASSESSMENT_EXISTS]], [422, [NOT_ACTIVE, ErrorCode.GRADES_LOCKED]])
  addGrade(@Param('id', UuidPipe) id: string, @Body() dto: CreateGradeDto, @CurrentUser() user: AuthUser) {
    return this.service.addGrade(id, dto, user);
  }

  @Patch('enrollments/:id/grades/:gradeId') @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Corrige uma nota lançada', description: 'RN44–RN45, RN49.' })
  @ApiOkResponse({ type: EnrollmentResponse })
  @ApiErrors(E.validation, E.unauthorized, [403, [ErrorCode.FORBIDDEN], 'Professor de outro curso'], E.notFound('Matrícula ou nota'),
    [422, [NOT_ACTIVE, ErrorCode.GRADES_LOCKED]])
  updateGrade(
    @Param('id', UuidPipe) id: string, @Param('gradeId', UuidPipe) gradeId: string,
    @Body() dto: UpdateGradeDto, @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateGrade(id, gradeId, dto, user);
  }

  @Post('enrollments/:id/certificate') @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Emite o certificado', description: 'RN50–RN53. Idempotente: 201 na primeira emissão; 200 devolvendo o mesmo certificado nas seguintes.' })
  @ApiCreatedResponse({ type: CertificateResponse, description: 'Certificado emitido agora' })
  @ApiOkResponse({ type: CertificateResponse, description: 'Certificado já existia (mesmo código)' })
  @ApiErrors(E.validation, E.unauthorized, [403, [ErrorCode.FORBIDDEN], 'Matrícula de outro aluno'], E.notFound('Matrícula'), [422, [ErrorCode.NOT_APPROVED]])
  async certificate(@Param('id', UuidPipe) id: string, @CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    const { created, certificate } = await this.service.issueCertificate(id, user);
    res.status(created ? 201 : 200);
    return presentCertificate(certificate);
  }

  @Get('courses/:id/enrollments') @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Turma do curso', description: 'Professor dono ou admin. Ativas primeiro, depois as canceladas.' })
  @ApiOkResponse({ type: [EnrollmentResponse] })
  @ApiErrors(E.validation, E.unauthorized, E.forbidden, E.notFound('Curso'))
  byCourse(@Param('id', UuidPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.byCourse(id, user);
  }
}
