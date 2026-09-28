import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AppException, NotFound } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { toPage } from '../../common/http/pagination';
import { User } from './user.entity';
import { presentUser } from './user.presenter';
import { ListUsersQuery } from './users.dto';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  async list(q: ListUsersQuery) {
    const qb = this.users.createQueryBuilder('u');
    if (q.search) {
      qb.andWhere(new Brackets((w) => w.where('u.name ILIKE :s', { s: `%${q.search}%` }).orWhere('u.email ILIKE :s')));
    }
    if (q.role) qb.andWhere('u.role = :role', { role: q.role });
    if (q.isActive) qb.andWhere('u.isActive = :active', { active: q.isActive === 'true' });
    qb.orderBy('u.createdAt', 'DESC').addOrderBy('u.name', 'ASC').skip((q.page - 1) * q.limit).take(q.limit);
    const [rows, total] = await qb.getManyAndCount();
    return toPage(rows.map(presentUser), total, q);
  }

  async get(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw NotFound('Usuário');
    return presentUser(user);
  }

  async setStatus(id: string, isActive: boolean, actorId: string) {
    if (id === actorId && !isActive) {
      throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY, ErrorCode.CANNOT_DEACTIVATE_SELF, 'Você não pode desativar a própria conta');
    }
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw NotFound('Usuário');
    user.isActive = isActive;
    return presentUser(await this.users.save(user));
  }
}
