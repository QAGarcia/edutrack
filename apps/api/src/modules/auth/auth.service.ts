import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { AppException, Conflict, NotFound } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { Role } from '../../domain/enums';
import { User } from '../users/user.entity';
import { presentUser } from '../users/user.presenter';
import { ChangePasswordDto, LoginDto, RegisterDto, UpdateProfileDto } from './auth.dto';

export const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>, private readonly jwt: JwtService) {}

  async register(dto: RegisterDto) {
    if (await this.users.exists({ where: { email: dto.email } })) {
      throw Conflict(ErrorCode.EMAIL_TAKEN, 'Este e-mail já está cadastrado');
    }
    const user = await this.users.save(
      this.users.create({
        name: dto.name,
        email: dto.email,
        role: dto.role ?? Role.STUDENT,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      }),
    );
    return this.issueSession(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({
      where: { email: dto.email },
      select: { id: true, name: true, email: true, role: true, bio: true, isActive: true, createdAt: true, passwordHash: true },
    });
    // Mesma mensagem para e-mail inexistente e senha errada: não revela quais e-mails existem.
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new AppException(HttpStatus.UNAUTHORIZED, ErrorCode.INVALID_CREDENTIALS, 'E-mail ou senha inválidos');
    }
    if (!user.isActive) {
      throw new AppException(HttpStatus.FORBIDDEN, ErrorCode.USER_INACTIVE, 'Sua conta está desativada. Procure a administração.');
    }
    return this.issueSession(user);
  }

  async me(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw NotFound('Usuário');
    return presentUser(user);
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    await this.users.update(id, { ...dto });
    return this.me(id);
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    const user = await this.users.findOneOrFail({ where: { id }, select: { id: true, passwordHash: true } });
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY, ErrorCode.INVALID_CURRENT_PASSWORD, 'Senha atual incorreta');
    }
    await this.users.update(id, { passwordHash: await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS) });
  }

  private async issueSession(user: User) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { accessToken, tokenType: 'Bearer', user: presentUser(user) };
  }
}
