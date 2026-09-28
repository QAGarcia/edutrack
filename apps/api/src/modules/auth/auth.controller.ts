import { Body, Controller, Get, HttpCode, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthUser, CurrentUser, Public } from '../../common/auth/decorators';
import { ErrorCode } from '../../common/errors/error-codes';
import { SessionResponse, UserResponse } from '../../common/http/responses';
import { ApiErrors, E } from '../../common/http/swagger';
import { env } from '../../config/env';
import { ChangePasswordDto, LoginDto, RegisterDto, UpdateProfileDto } from './auth.dto';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public() @Post('register')
  @ApiOperation({ summary: 'Cria conta de aluno ou professor e já retorna o token', description: 'RN01–RN04. E-mail normalizado (trim + minúsculas). Perfil ADMIN não é permitido.' })
  @ApiCreatedResponse({ type: SessionResponse, description: 'Conta criada; usuário já autenticado' })
  @ApiErrors(E.validation, [409, [ErrorCode.EMAIL_TAKEN]])
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public() @Post('login') @HttpCode(200)
  @UseGuards(ThrottlerGuard) @Throttle({ default: { limit: env.LOGIN_RATE_LIMIT, ttl: 60_000 } })
  @ApiOperation({ summary: 'Autentica e retorna um JWT', description: `RN05, RN06, RN08. Limite de ${env.LOGIN_RATE_LIMIT} tentativas por minuto por IP (variável LOGIN_RATE_LIMIT).` })
  @ApiOkResponse({ type: SessionResponse })
  @ApiErrors(
    E.validation,
    [401, [ErrorCode.INVALID_CREDENTIALS], 'Mesma mensagem para e-mail inexistente e senha errada'],
    [403, [ErrorCode.USER_INACTIVE], 'Conta desativada'],
    [429, [ErrorCode.RATE_LIMITED]],
  )
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me') @ApiBearerAuth()
  @ApiOperation({ summary: 'Perfil do usuário autenticado' })
  @ApiOkResponse({ type: UserResponse })
  @ApiErrors(E.unauthorized)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @Patch('me') @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza nome e bio', description: 'RN11. E-mail e perfil não são editáveis.' })
  @ApiOkResponse({ type: UserResponse })
  @ApiErrors(E.validation, E.unauthorized)
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user.id, dto);
  }

  @Post('me/password') @HttpCode(204) @ApiBearerAuth()
  @ApiOperation({ summary: 'Troca a senha (exige a senha atual)', description: 'RN10.' })
  @ApiNoContentResponse({ description: 'Senha alterada' })
  @ApiErrors(E.validation, E.unauthorized, [422, [ErrorCode.INVALID_CURRENT_PASSWORD]])
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.id, dto);
  }
}
