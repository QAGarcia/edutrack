import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQuery {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional() @Type(() => Number) @IsInt({ message: 'page deve ser inteiro' }) @Min(1, { message: 'page deve ser no mínimo 1' })
  page: number = 1;

  @ApiPropertyOptional({ default: 12, minimum: 1, maximum: 50 })
  @IsOptional() @Type(() => Number) @IsInt({ message: 'limit deve ser inteiro' })
  @Min(1, { message: 'limit deve ser no mínimo 1' }) @Max(50, { message: 'limit deve ser no máximo 50' })
  limit: number = 12;
}

export interface Page<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export function toPage<T>(data: T[], total: number, q: PaginationQuery): Page<T> {
  return { data, meta: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) } };
}
