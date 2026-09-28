import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PaginationQuery } from '../../common/http/pagination';
import { CourseLevel, CourseStatus } from '../../domain/enums';

const trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CreateCourseDto {
  @ApiProperty({ example: 'Testes automatizados com Playwright' })
  @trim() @IsString({ message: 'título é obrigatório' })
  @MinLength(5, { message: 'título deve ter ao menos 5 caracteres' }) @MaxLength(120, { message: 'título deve ter no máximo 120 caracteres' })
  title: string;

  @ApiProperty({ example: 'Do primeiro teste ao pipeline de CI, na prática.' })
  @trim() @IsString({ message: 'resumo é obrigatório' })
  @MinLength(10, { message: 'resumo deve ter ao menos 10 caracteres' }) @MaxLength(200, { message: 'resumo deve ter no máximo 200 caracteres' })
  summary: string;

  @ApiPropertyOptional({ example: 'Descrição completa do curso.' })
  @IsOptional() @trim() @IsString() @MaxLength(5000, { message: 'descrição deve ter no máximo 5000 caracteres' })
  description?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'categoria inválida' })
  categoryId: string;

  @ApiProperty({ enum: CourseLevel })
  @IsEnum(CourseLevel, { message: 'nível deve ser BEGINNER, INTERMEDIATE ou ADVANCED' })
  level: CourseLevel;

  @ApiProperty({ example: 40, minimum: 1, maximum: 400 })
  @IsInt({ message: 'carga horária deve ser um número inteiro' })
  @Min(1, { message: 'carga horária deve ser no mínimo 1' }) @Max(400, { message: 'carga horária deve ser no máximo 400' })
  workloadHours: number;

  @ApiProperty({ example: 30, minimum: 1, maximum: 500 })
  @IsInt({ message: 'vagas deve ser um número inteiro' })
  @Min(1, { message: 'vagas deve ser no mínimo 1' }) @Max(500, { message: 'vagas deve ser no máximo 500' })
  capacity: number;
}

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}

export const COURSE_SORTS = ['newest', 'oldest', 'title', 'popular'] as const;
export const COURSE_SCOPES = ['catalog', 'mine', 'all'] as const;

export class ListCoursesQuery extends PaginationQuery {
  @ApiPropertyOptional({ description: 'Busca parcial em título e resumo, sem diferenciar maiúsculas/minúsculas e acentos' })
  @IsOptional() @trim() @IsString() @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Slug da categoria' }) @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional({ enum: CourseLevel }) @IsOptional() @IsEnum(CourseLevel, { message: 'nível inválido' }) level?: CourseLevel;
  @ApiPropertyOptional({ enum: CourseStatus, description: 'Só tem efeito com scope=mine ou scope=all' })
  @IsOptional() @IsEnum(CourseStatus, { message: 'status inválido' }) status?: CourseStatus;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4', { message: 'teacherId inválido' }) teacherId?: string;

  @ApiPropertyOptional({ enum: COURSE_SORTS, default: 'newest' })
  @IsOptional() @IsIn(COURSE_SORTS as unknown as string[], { message: 'sort deve ser newest, oldest, title ou popular' })
  sort: (typeof COURSE_SORTS)[number] = 'newest';

  @ApiPropertyOptional({ enum: COURSE_SCOPES, default: 'catalog', description: 'catalog = publicados; mine = do professor logado; all = todos (admin)' })
  @IsOptional() @IsIn(COURSE_SCOPES as unknown as string[], { message: 'scope deve ser catalog, mine ou all' })
  scope: (typeof COURSE_SCOPES)[number] = 'catalog';
}

export class CreateLessonDto {
  @ApiProperty({ example: 'Configurando o ambiente' })
  @trim() @IsString({ message: 'título é obrigatório' })
  @MinLength(3, { message: 'título deve ter ao menos 3 caracteres' }) @MaxLength(120, { message: 'título deve ter no máximo 120 caracteres' })
  title: string;

  @ApiPropertyOptional({ example: 'Conteúdo da aula em texto.' })
  @IsOptional() @IsString() @MaxLength(20000, { message: 'conteúdo deve ter no máximo 20000 caracteres' })
  content?: string;

  @ApiProperty({ example: 15, minimum: 1, maximum: 600 })
  @Type(() => Number) @IsInt({ message: 'duração deve ser um número inteiro' })
  @Min(1, { message: 'duração deve ser no mínimo 1 minuto' }) @Max(600, { message: 'duração deve ser no máximo 600 minutos' })
  durationMinutes: number;
}

export class UpdateLessonDto extends PartialType(CreateLessonDto) {}

export class ReorderLessonsDto {
  @ApiProperty({ type: [String], description: 'Todos os IDs das aulas do curso, na nova ordem' })
  @IsUUID('4', { each: true, message: 'lessonIds deve conter apenas UUIDs' })
  lessonIds: string[];
}
