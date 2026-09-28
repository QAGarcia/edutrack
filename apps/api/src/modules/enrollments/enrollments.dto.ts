import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, Min } from 'class-validator';
import { AcademicPolicy } from '../../domain/academic-policy';
import { EnrollmentStatus } from '../../domain/enums';

export class CreateEnrollmentDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4', { message: 'courseId deve ser um UUID válido' })
  courseId: string;
}

export class ListMyEnrollmentsQuery {
  @ApiPropertyOptional({ enum: EnrollmentStatus }) @IsOptional() @IsEnum(EnrollmentStatus, { message: 'status inválido' })
  status?: EnrollmentStatus;
}

export class CreateGradeDto {
  @ApiProperty({ example: 'P1', description: 'Letras, números, espaço e hífen; até 20 caracteres. Normalizado para maiúsculas.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString({ message: 'avaliação é obrigatória' })
  @Matches(/^[A-Z0-9][A-Z0-9 -]{0,19}$/, { message: 'avaliação deve ter de 1 a 20 caracteres (letras, números, espaço ou hífen)' })
  assessment: string;

  @ApiProperty({ example: 8.5, minimum: 0, maximum: 10 })
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false }, { message: 'nota deve ser um número com até 2 casas decimais' })
  @Min(AcademicPolicy.MIN_GRADE, { message: `nota deve ser no mínimo ${AcademicPolicy.MIN_GRADE}` })
  @Max(AcademicPolicy.MAX_GRADE, { message: `nota deve ser no máximo ${AcademicPolicy.MAX_GRADE}` })
  value: number;
}

export class UpdateGradeDto {
  @ApiProperty({ example: 9, minimum: 0, maximum: 10 })
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false }, { message: 'nota deve ser um número com até 2 casas decimais' })
  @Min(AcademicPolicy.MIN_GRADE, { message: `nota deve ser no mínimo ${AcademicPolicy.MIN_GRADE}` })
  @Max(AcademicPolicy.MAX_GRADE, { message: `nota deve ser no máximo ${AcademicPolicy.MAX_GRADE}` })
  value: number;
}
