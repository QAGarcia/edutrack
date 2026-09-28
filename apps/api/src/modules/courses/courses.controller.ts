import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, Public, Roles } from '../../common/auth/decorators';
import { ErrorCode } from '../../common/errors/error-codes';
import { CourseDetailResponse, CourseSummaryResponse, LessonResponse } from '../../common/http/responses';
import { ApiErrors, ApiPageResponse, E } from '../../common/http/swagger';
import { UuidPipe } from '../../common/http/validation.pipe';
import { Role } from '../../domain/enums';
import { LessonsService } from '../lessons/lessons.service';
import { CreateCourseDto, CreateLessonDto, ListCoursesQuery, ReorderLessonsDto, UpdateCourseDto, UpdateLessonDto } from './courses.dto';
import { CoursesService } from './courses.service';

const OWNER = 'Apenas o professor dono do curso ou um administrador.';

@ApiTags('Courses')
@ApiBearerAuth()
@Controller('api/courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService, private readonly lessons: LessonsService) {}

  @Public() @Get()
  @ApiOperation({
    summary: 'Lista cursos com busca, filtros, ordenação e paginação',
    description: 'Público (token opcional). RN23–RN27. scope=catalog mostra só publicados; scope=mine é do professor; scope=all é do admin.',
  })
  @ApiPageResponse(CourseSummaryResponse)
  @ApiErrors(E.validation, [403, [ErrorCode.INVALID_SCOPE], 'scope=mine sem ser professor ou scope=all sem ser admin'])
  list(@Query() q: ListCoursesQuery, @CurrentUser() viewer?: AuthUser) {
    return this.courses.list(q, viewer);
  }

  @Public() @Get(':idOrSlug')
  @ApiOperation({
    summary: 'Detalhe do curso por ID ou slug',
    description: 'Público (token opcional). RN28–RN29. Rascunho só é visível ao dono e ao admin (os demais recebem 404). Com token, inclui o contexto do usuário em `viewer`.',
  })
  @ApiParam({ name: 'idOrSlug', example: 'playwright-com-typescript-do-zero' })
  @ApiOkResponse({ type: CourseDetailResponse })
  @ApiErrors(E.notFound('Curso inexistente ou rascunho de outra pessoa;'))
  detail(@Param('idOrSlug') idOrSlug: string, @CurrentUser() viewer?: AuthUser) {
    return this.courses.detail(idOrSlug, viewer);
  }

  @Post() @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Cria curso em rascunho', description: 'RN15–RN16. O slug é gerado do título e é único.' })
  @ApiCreatedResponse({ type: CourseDetailResponse })
  @ApiErrors(E.validation, E.unauthorized, E.forbidden, [422, [ErrorCode.INVALID_CATEGORY]])
  create(@Body() dto: CreateCourseDto, @CurrentUser() actor: AuthUser) {
    return this.courses.create(dto, actor);
  }

  @Patch(':id') @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Atualiza curso', description: `${OWNER} RN19–RN21. Mudar o título gera novo slug.` })
  @ApiOkResponse({ type: CourseDetailResponse })
  @ApiErrors(E.validation, E.unauthorized, E.forbidden, E.notFound('Curso'),
    [422, [ErrorCode.COURSE_NOT_EDITABLE, ErrorCode.CAPACITY_BELOW_ENROLLED, ErrorCode.INVALID_CATEGORY]])
  update(@Param('id', UuidPipe) id: string, @Body() dto: UpdateCourseDto, @CurrentUser() actor: AuthUser) {
    return this.courses.update(id, dto, actor);
  }

  @Post(':id/publish') @HttpCode(200) @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'DRAFT → PUBLISHED', description: `${OWNER} RN17–RN18. Exige ao menos 1 aula.` })
  @ApiOkResponse({ type: CourseDetailResponse })
  @ApiErrors(E.validation, E.unauthorized, E.forbidden, E.notFound('Curso'),
    [422, [ErrorCode.INVALID_STATUS_TRANSITION, ErrorCode.COURSE_WITHOUT_LESSONS]])
  publish(@Param('id', UuidPipe) id: string, @CurrentUser() actor: AuthUser) {
    return this.courses.publish(id, actor);
  }

  @Post(':id/archive') @HttpCode(200) @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'PUBLISHED → ARCHIVED', description: `${OWNER} RN17. Encerra novas matrículas; o curso vira somente leitura.` })
  @ApiOkResponse({ type: CourseDetailResponse })
  @ApiErrors(E.validation, E.unauthorized, E.forbidden, E.notFound('Curso'), [422, [ErrorCode.INVALID_STATUS_TRANSITION]])
  archive(@Param('id', UuidPipe) id: string, @CurrentUser() actor: AuthUser) {
    return this.courses.archive(id, actor);
  }

  @Delete(':id') @HttpCode(204) @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Exclui curso em rascunho', description: `${OWNER} RN22. Remove também as aulas.` })
  @ApiNoContentResponse({ description: 'Curso excluído' })
  @ApiErrors(E.validation, E.unauthorized, E.forbidden, E.notFound('Curso'),
    [409, [ErrorCode.COURSE_HAS_ENROLLMENTS]], [422, [ErrorCode.INVALID_STATUS_TRANSITION]])
  remove(@Param('id', UuidPipe) id: string, @CurrentUser() actor: AuthUser) {
    return this.courses.remove(id, actor);
  }

  // ----- aulas -----

  @Get(':id/lessons/:lessonId')
  @ApiOperation({ summary: 'Conteúdo completo da aula', description: 'RN33. Dono, admin ou aluno com matrícula ATIVA. Para aluno, inclui `completed`.' })
  @ApiOkResponse({ type: LessonResponse })
  @ApiErrors(E.validation, E.unauthorized, [403, [ErrorCode.FORBIDDEN], 'Aluno sem matrícula ativa'], E.notFound('Aula'))
  lesson(@Param('id', UuidPipe) id: string, @Param('lessonId', UuidPipe) lessonId: string, @CurrentUser() viewer: AuthUser) {
    return this.lessons.get(id, lessonId, viewer);
  }

  @Post(':id/lessons') @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Adiciona aula ao final do curso', description: `${OWNER} RN30.` })
  @ApiCreatedResponse({ type: LessonResponse })
  @ApiErrors(E.validation, E.unauthorized, E.forbidden, E.notFound('Curso'), [422, [ErrorCode.COURSE_NOT_EDITABLE]])
  addLesson(@Param('id', UuidPipe) id: string, @Body() dto: CreateLessonDto, @CurrentUser() actor: AuthUser) {
    return this.lessons.create(id, dto, actor);
  }

  @Patch(':id/lessons/:lessonId') @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Edita aula', description: `${OWNER} RN30.` })
  @ApiOkResponse({ type: LessonResponse })
  @ApiErrors(E.validation, E.unauthorized, E.forbidden, E.notFound('Curso ou aula'), [422, [ErrorCode.COURSE_NOT_EDITABLE]])
  updateLesson(
    @Param('id', UuidPipe) id: string, @Param('lessonId', UuidPipe) lessonId: string,
    @Body() dto: UpdateLessonDto, @CurrentUser() actor: AuthUser,
  ) {
    return this.lessons.update(id, lessonId, dto, actor);
  }

  @Delete(':id/lessons/:lessonId') @HttpCode(204) @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Remove aula', description: `${OWNER} RN32. As posições das demais aulas são reorganizadas.` })
  @ApiNoContentResponse({ description: 'Aula removida' })
  @ApiErrors(E.validation, E.unauthorized, E.forbidden, E.notFound('Curso ou aula'),
    [422, [ErrorCode.COURSE_NOT_EDITABLE, ErrorCode.LAST_LESSON_OF_PUBLISHED_COURSE]])
  removeLesson(@Param('id', UuidPipe) id: string, @Param('lessonId', UuidPipe) lessonId: string, @CurrentUser() actor: AuthUser) {
    return this.lessons.remove(id, lessonId, actor);
  }

  @Post(':id/lessons/reorder') @HttpCode(200) @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Reordena aulas', description: `${OWNER} RN31. Envie TODOS os IDs das aulas, na nova ordem.` })
  @ApiOkResponse({ type: [LessonResponse], description: 'Aulas na nova ordem' })
  @ApiErrors(E.validation, E.unauthorized, E.forbidden, E.notFound('Curso'),
    [422, [ErrorCode.INVALID_LESSON_ORDER, ErrorCode.COURSE_NOT_EDITABLE]])
  reorder(@Param('id', UuidPipe) id: string, @Body() dto: ReorderLessonsDto, @CurrentUser() actor: AuthUser) {
    return this.lessons.reorder(id, dto, actor);
  }
}
