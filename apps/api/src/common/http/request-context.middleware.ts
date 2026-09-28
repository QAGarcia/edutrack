import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

/** Gera/propaga X-Request-Id e registra uma linha de log por requisição da API. */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const id = (req.headers['x-request-id'] as string) || randomUUID();
    req.headers['x-request-id'] = id;
    res.setHeader('X-Request-Id', id);
    const start = Date.now();
    res.on('finish', () => {
      if (req.originalUrl.startsWith('/api')) {
        this.logger.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
      }
    });
    next();
  }
}
