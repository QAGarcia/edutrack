import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes';

export interface ErrorDetail {
  field: string;
  message: string;
}

/** Exceção de domínio: carrega status HTTP, código estável e mensagem para humanos. */
export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: ErrorDetail[],
  ) {
    super({ code, message, details }, status);
  }
}

export const NotFound = (what: string) => new AppException(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, `${what} não encontrado(a)`);
export const Forbidden = (message = 'Você não tem permissão para esta ação') =>
  new AppException(HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN, message);
export const Conflict = (code: ErrorCode, message: string) => new AppException(HttpStatus.CONFLICT, code, message);
export const BusinessRule = (code: ErrorCode, message: string) =>
  new AppException(HttpStatus.UNPROCESSABLE_ENTITY, code, message);
