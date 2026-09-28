import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiProperty, ApiPropertyOptional, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ErrorCode } from '../errors/error-codes';

export class ErrorDetailDto {
  @ApiProperty({ example: 'title' }) field: string;
  @ApiProperty({ example: 'título deve ter ao menos 5 caracteres' }) message: string;
}

/** Formato único de erro de toda a API. */
export class ErrorResponseDto {
  @ApiProperty({ example: 422 }) statusCode: number;
  @ApiProperty({ enum: Object.values(ErrorCode), enumName: 'ErrorCode', description: 'Código estável para uso por máquina (frontend e testes)' })
  code: ErrorCode;
  @ApiProperty({ example: 'Adicione ao menos uma aula antes de publicar', description: 'Texto para humanos; pode mudar' }) message: string;
  @ApiPropertyOptional({ type: [ErrorDetailDto], description: 'Presente apenas em erros de validação (400)' }) details?: ErrorDetailDto[];
  @ApiProperty({ example: '/api/courses/8f0c.../publish' }) path: string;
  @ApiProperty({ format: 'date-time' }) timestamp: string;
  @ApiProperty({ format: 'uuid', description: 'Mesmo valor do header X-Request-Id' }) requestId: string;
}

export class PageMetaDto {
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 12 }) limit: number;
  @ApiProperty({ example: 42 }) total: number;
  @ApiProperty({ example: 4 }) totalPages: number;
}

const STATUS_TEXT: Record<number, string> = {
  400: 'Dados inválidos',
  401: 'Não autenticado',
  403: 'Sem permissão',
  404: 'Não encontrado',
  409: 'Conflito de estado',
  422: 'Regra de negócio violada',
  429: 'Limite de tentativas excedido',
};

/** Mensagens reais devolvidas pela API, usadas nos exemplos da documentação. */
const DEFAULT_MESSAGE: Partial<Record<ErrorCode, string>> = {
  VALIDATION_ERROR: 'Dados inválidos',
  UNAUTHORIZED: 'Autenticação necessária',
  INVALID_CREDENTIALS: 'E-mail ou senha inválidos',
  USER_INACTIVE: 'Sua conta está desativada. Procure a administração.',
  FORBIDDEN: 'Seu perfil não tem permissão para esta ação',
  NOT_FOUND: 'Curso não encontrado(a)',
  RATE_LIMITED: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
  EMAIL_TAKEN: 'Este e-mail já está cadastrado',
  INVALID_CURRENT_PASSWORD: 'Senha atual incorreta',
  CANNOT_DEACTIVATE_SELF: 'Você não pode desativar a própria conta',
  CATEGORY_EXISTS: 'Já existe uma categoria com este nome',
  INVALID_CATEGORY: 'Categoria informada não existe',
  INVALID_SCOPE: 'scope=all é exclusivo de administradores',
  INVALID_LESSON_ORDER: 'Envie todos os IDs das aulas do curso, sem repetir',
  COURSE_NOT_EDITABLE: 'Cursos arquivados não podem ser alterados',
  INVALID_STATUS_TRANSITION: 'Apenas cursos em rascunho podem ser publicados',
  COURSE_WITHOUT_LESSONS: 'Adicione ao menos uma aula antes de publicar',
  CAPACITY_BELOW_ENROLLED: 'Vagas não podem ser menores que o número de alunos ativos (3)',
  COURSE_HAS_ENROLLMENTS: 'Curso possui matrículas e não pode ser excluído',
  LAST_LESSON_OF_PUBLISHED_COURSE: 'Um curso publicado precisa ter ao menos uma aula',
  COURSE_NOT_OPEN: 'Este curso não está aberto para matrículas',
  ALREADY_ENROLLED: 'Você já está matriculado neste curso',
  COURSE_FULL: 'Não há vagas disponíveis neste curso',
  ENROLLMENT_NOT_ACTIVE: 'Esta matrícula já está cancelada',
  ENROLLMENT_HAS_GRADES: 'Matrículas com notas lançadas não podem ser canceladas',
  ASSESSMENT_EXISTS: 'A avaliação P1 já foi lançada para este aluno',
  GRADES_LOCKED: 'Certificado já emitido: as notas estão bloqueadas',
  NOT_APPROVED: 'O certificado só pode ser emitido após a aprovação no curso',
};

export type ErrorSpec = [status: number, codes: ErrorCode[], note?: string];

/**
 * Documenta os erros possíveis de uma rota: um response por status,
 * com um exemplo para cada código de erro que aquele status pode trazer.
 */
export function ApiErrors(...specs: ErrorSpec[]) {
  return applyDecorators(
    ApiExtraModels(ErrorResponseDto, ErrorDetailDto),
    ...specs.map(([status, codes, note]) =>
      ApiResponse({
        status,
        description: `${STATUS_TEXT[status] ?? 'Erro'} — ${codes.map((c) => '`' + c + '`').join(', ')}${note ? `. ${note}` : ''}`,
        schema: { $ref: getSchemaPath(ErrorResponseDto) },
        examples: Object.fromEntries(
          codes.map((code) => [
            code,
            {
              summary: code,
              value: {
                statusCode: status,
                code,
                message: DEFAULT_MESSAGE[code] ?? code,
                ...(code === 'VALIDATION_ERROR' ? { details: [{ field: 'campo', message: 'mensagem de validação' }] } : {}),
                path: '/api/...',
                timestamp: '2026-09-28T12:00:00.000Z',
                requestId: '8f0c2a4e-1b7d-4c1e-9a55-2f6c0e9d1a3b',
              },
            },
          ]),
        ),
      }),
    ),
  );
}

/** Resposta paginada { data: T[], meta } */
export function ApiPageResponse(model: Type<unknown>, description = 'Página de resultados') {
  return applyDecorators(
    ApiExtraModels(model, PageMetaDto),
    ApiResponse({
      status: 200,
      description,
      schema: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: { type: 'array', items: { $ref: getSchemaPath(model) } },
          meta: { $ref: getSchemaPath(PageMetaDto) },
        },
      },
    }),
  );
}

// Atalhos para os erros mais comuns
export const E = {
  validation: [400, [ErrorCode.VALIDATION_ERROR]] as ErrorSpec,
  unauthorized: [401, [ErrorCode.UNAUTHORIZED]] as ErrorSpec,
  forbidden: [403, [ErrorCode.FORBIDDEN]] as ErrorSpec,
  /** Ex.: notFound('Curso') → "Curso inexistente"; texto terminado em ';' é usado como está. */
  notFound: (what: string) => [404, [ErrorCode.NOT_FOUND], what.endsWith(';') ? what.slice(0, -1) : `${what} inexistente`] as ErrorSpec,
};
