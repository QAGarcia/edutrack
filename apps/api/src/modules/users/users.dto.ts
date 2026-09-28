import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQuery } from '../../common/http/pagination';
import { Role } from '../../domain/enums';

export class ListUsersQuery extends PaginationQuery {
  @ApiPropertyOptional({ description: 'Busca por nome ou e-mail' }) @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ enum: Role }) @IsOptional() @IsEnum(Role, { message: 'perfil inválido' }) role?: Role;
  @ApiPropertyOptional({ enum: ['true', 'false'] }) @IsOptional() @IsIn(['true', 'false'], { message: 'isActive deve ser true ou false' }) isActive?: string;
}

export class UpdateUserStatusDto {
  @ApiProperty() @Transform(({ value }) => value) @IsBoolean({ message: 'isActive deve ser booleano' }) isActive: boolean;
}
