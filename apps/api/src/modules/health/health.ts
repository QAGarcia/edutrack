import { Controller, Get, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { HealthResponse } from '../../common/http/responses';
import { InjectDataSource } from '@nestjs/typeorm';
import { Response } from 'express';
import { DataSource } from 'typeorm';
import { Public } from '../../common/auth/decorators';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version } = require('../../../package.json') as { version: string };

@ApiTags('Health')
@Controller('api/health')
export class HealthController {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  @Public() @Get()
  @ApiOperation({ summary: 'Saúde da aplicação e do banco', description: 'Use para esperar a aplicação subir no CI.' })
  @ApiOkResponse({ type: HealthResponse, description: 'Aplicação e banco no ar' })
  @ApiServiceUnavailableResponse({ type: HealthResponse, description: 'Banco fora do ar (status=degraded)' })
  async check(@Res({ passthrough: true }) res: Response) {
    let database = 'up';
    try {
      await this.ds.query('SELECT 1');
    } catch {
      database = 'down';
      res.status(503);
    }
    return { status: database === 'up' ? 'ok' : 'degraded', database, version, uptimeSeconds: Math.round(process.uptime()) };
  }
}
