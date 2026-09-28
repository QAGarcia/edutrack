import { Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResetResponse } from '../../common/http/responses';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../../common/auth/decorators';
import { seed } from '../../database/seed/seed';

/**
 * Apoio à automação. Só é registrado quando ENABLE_TEST_ROUTES=true
 * (fora disso a rota simplesmente não existe → 404).
 */
@ApiTags('Testing')
@Controller('api/testing')
export class TestingController {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  @Public() @Post('reset') @HttpCode(200)
  @ApiOperation({ summary: '[SOMENTE TESTE] Limpa o banco e recria a massa padrão', description: 'Existe apenas com ENABLE_TEST_ROUTES=true. Leva cerca de 1 s. IDs mudam a cada reset.' })
  @ApiOkResponse({ type: ResetResponse })
  reset() {
    return seed(this.ds);
  }
}
