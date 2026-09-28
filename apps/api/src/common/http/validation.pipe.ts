import { HttpStatus, ParseUUIDPipe, ValidationError, ValidationPipe } from '@nestjs/common';
import { AppException, ErrorDetail } from '../errors/app.exception';
import { ErrorCode } from '../errors/error-codes';

function flatten(errors: ValidationError[], parent = ''): ErrorDetail[] {
  return errors.flatMap((e) => {
    const field = parent ? `${parent}.${e.property}` : e.property;
    const own = Object.entries(e.constraints ?? {}).map(([rule, message]) => ({
      field,
      message: rule === 'whitelistValidation' ? 'campo não permitido' : message,
    }));
    return [...own, ...flatten(e.children ?? [], field)];
  });
}

export const appValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: (errors) =>
    new AppException(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR, 'Dados inválidos', flatten(errors)),
});

/** Valida parâmetros de rota do tipo UUID com o mesmo formato de erro da API. */
export const UuidPipe = new ParseUUIDPipe({
  exceptionFactory: () => new AppException(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR, 'Identificador inválido: esperado um UUID'),
});
