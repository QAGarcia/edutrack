import { Body, Controller, Get, Injectable, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { CategoryCreatedResponse, CategoryResponse } from '../../common/http/responses';
import { ApiErrors, E } from '../../common/http/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Repository } from 'typeorm';
import { Public, Roles } from '../../common/auth/decorators';
import { Conflict } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { slugify } from '../../common/slug';
import { CourseStatus, Role } from '../../domain/enums';
import { Category } from './category.entity';
import { Course } from '../courses/course.entity';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Ciência de Dados' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString() @MinLength(2, { message: 'nome deve ter ao menos 2 caracteres' }) @MaxLength(60, { message: 'nome deve ter no máximo 60 caracteres' })
  name: string;
}

@Injectable()
export class CategoriesService {
  constructor(@InjectRepository(Category) private readonly repo: Repository<Category>) {}

  async list() {
    const rows = await this.repo
      .createQueryBuilder('cat')
      .leftJoin(Course, 'c', 'c.category_id = cat.id AND c.status = :st', { st: CourseStatus.PUBLISHED })
      .select(['cat.id AS id', 'cat.name AS name', 'cat.slug AS slug'])
      .addSelect('COUNT(c.id)::int', 'publishedCourses')
      .groupBy('cat.id')
      .orderBy('cat.name', 'ASC')
      .getRawMany<{ id: string; name: string; slug: string; publishedCourses: number }>();
    return rows;
  }

  async create(dto: CreateCategoryDto) {
    const slug = slugify(dto.name);
    if (await this.repo.exists({ where: [{ slug }, { name: dto.name }] })) {
      throw Conflict(ErrorCode.CATEGORY_EXISTS, 'Já existe uma categoria com este nome');
    }
    return this.repo.save(this.repo.create({ name: dto.name, slug }));
  }
}

@ApiTags('Categories')
@Controller('api/categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Public() @Get() @ApiOperation({ summary: 'Lista categorias com a quantidade de cursos publicados' })
  @ApiOkResponse({ type: [CategoryResponse] })
  list() {
    return this.service.list();
  }

  @Post() @Roles(Role.ADMIN) @ApiBearerAuth() @ApiOperation({ summary: 'Cria categoria (admin)' })
  @ApiCreatedResponse({ type: CategoryCreatedResponse })
  @ApiErrors(E.validation, E.unauthorized, E.forbidden, [409, [ErrorCode.CATEGORY_EXISTS]])
  create(@Body() dto: CreateCategoryDto) {
    return this.service.create(dto);
  }
}
