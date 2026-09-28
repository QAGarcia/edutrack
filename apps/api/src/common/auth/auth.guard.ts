import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../domain/enums';
import { User } from '../../modules/users/user.entity';
import { AppException, Forbidden } from '../errors/app.exception';
import { ErrorCode } from '../errors/error-codes';
import { AuthUser, IS_PUBLIC, ROLES } from './decorators';

/**
 * Guard global. Decisões:
 * - Todas as rotas exigem token, a não ser que sejam @Public() (seguro por padrão).
 * - O usuário é recarregado do banco a cada requisição: desativar alguém tem efeito imediato.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets) ?? false;
    const req = ctx.switchToHttp().getRequest();

    const header: string | undefined = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (token) {
      const user = await this.resolve(token);
      if (user) req.user = user;
      else if (!isPublic) throw new AppException(HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED, 'Sessão inválida ou expirada');
    }

    if (isPublic) return true;
    if (!req.user) throw new AppException(HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED, 'Autenticação necessária');

    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES, targets);
    if (roles?.length && !roles.includes(req.user.role)) throw Forbidden('Seu perfil não tem permissão para esta ação');
    return true;
  }

  private async resolve(token: string): Promise<AuthUser | null> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      const user = await this.users.findOne({ where: { id: payload.sub } });
      if (!user || !user.isActive) return null;
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    } catch {
      return null;
    }
  }
}
