import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Role } from '../../domain/enums';

export const IS_PUBLIC = 'auth:isPublic';
/** Rota acessível sem token. Se um token válido vier, o usuário ainda é identificado. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ROLES = 'auth:roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser | undefined => ctx.switchToHttp().getRequest().user,
);
