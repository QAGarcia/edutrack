import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Role } from '../../domain/enums';

const trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
const lower = () => Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));

export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/;
export const PASSWORD_MESSAGE = 'senha deve ter de 8 a 64 caracteres, com letra maiúscula, letra minúscula e número';

export class RegisterDto {
  @ApiProperty({ example: 'Ana Souza' })
  @trim() @IsString({ message: 'nome é obrigatório' })
  @MinLength(3, { message: 'nome deve ter ao menos 3 caracteres' }) @MaxLength(120, { message: 'nome deve ter no máximo 120 caracteres' })
  name: string;

  @ApiProperty({ example: 'ana@exemplo.com' })
  @lower() @IsEmail({}, { message: 'e-mail inválido' }) @MaxLength(160, { message: 'e-mail deve ter no máximo 160 caracteres' })
  email: string;

  @ApiProperty({ example: 'Senha@123', description: PASSWORD_MESSAGE })
  @IsString({ message: 'senha é obrigatória' }) @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
  password: string;

  @ApiPropertyOptional({ enum: [Role.STUDENT, Role.TEACHER], default: Role.STUDENT })
  @IsOptional() @IsIn([Role.STUDENT, Role.TEACHER], { message: 'perfil deve ser STUDENT ou TEACHER' })
  role?: Role;
}

export class LoginDto {
  @ApiProperty({ example: 'aluno@edutrack.dev' })
  @lower() @IsEmail({}, { message: 'e-mail inválido' })
  email: string;

  @ApiProperty({ example: 'Senha@123' })
  @IsString({ message: 'senha é obrigatória' }) @MinLength(1, { message: 'senha é obrigatória' })
  password: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional() @trim() @IsString() @MinLength(3, { message: 'nome deve ter ao menos 3 caracteres' }) @MaxLength(120, { message: 'nome deve ter no máximo 120 caracteres' })
  name?: string;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional() @trim() @IsString() @MaxLength(300, { message: 'bio deve ter no máximo 300 caracteres' })
  bio?: string;
}

export class ChangePasswordDto {
  @ApiProperty() @IsString({ message: 'senha atual é obrigatória' }) @MinLength(1, { message: 'senha atual é obrigatória' })
  currentPassword: string;

  @ApiProperty({ description: PASSWORD_MESSAGE })
  @IsString() @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
  newPassword: string;
}
