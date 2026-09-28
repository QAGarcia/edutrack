import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, Roles } from '../../common/auth/decorators';
import { ErrorCode } from '../../common/errors/error-codes';
import { UserResponse } from '../../common/http/responses';
import { ApiErrors, ApiPageResponse, E } from '../../common/http/swagger';
import { UuidPipe } from '../../common/http/validation.pipe';
import { Role } from '../../domain/enums';
import { ListUsersQuery, UpdateUserStatusDto } from './users.dto';
import { UsersService } from './users.service';

@ApiTags('Users (admin)')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('api/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Lista usuários com filtros e paginação', description: 'RN12–RN13. Ordenação: mais recentes primeiro.' })
  @ApiPageResponse(UserResponse)
  @ApiErrors(E.validation, E.unauthorized, E.forbidden)
  list(@Query() q: ListUsersQuery) {
    return this.users.list(q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um usuário' })
  @ApiOkResponse({ type: UserResponse })
  @ApiErrors(E.validation, E.unauthorized, E.forbidden, E.notFound('Usuário'))
  get(@Param('id', UuidPipe) id: string) {
    return this.users.get(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Ativa ou desativa um usuário', description: 'RN07, RN14. Desativar invalida as sessões do usuário imediatamente.' })
  @ApiOkResponse({ type: UserResponse })
  @ApiErrors(E.validation, E.unauthorized, E.forbidden, E.notFound('Usuário'), [422, [ErrorCode.CANNOT_DEACTIVATE_SELF]])
  setStatus(@Param('id', UuidPipe) id: string, @Body() dto: UpdateUserStatusDto, @CurrentUser() actor: AuthUser) {
    return this.users.setStatus(id, dto.isActive, actor.id);
  }
}
