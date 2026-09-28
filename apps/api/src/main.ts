import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { appValidationPipe } from './common/http/validation.pipe';
import { env } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['log', 'warn', 'error'] });
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.enableCors({ origin: env.CORS_ORIGIN.split(','), exposedHeaders: ['X-Request-Id'] });
  app.useGlobalPipes(appValidationPipe);
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('EduTrack API')
    .setVersion('2.0.0')
    .setDescription(
      [
        'API da plataforma EduTrack: cursos, aulas, matrículas, progresso, notas e certificados.',
        '',
        '### Autenticação',
        '1. `POST /api/auth/login` com `aluno@edutrack.dev` / `Senha@123` (ou outro usuário do seed).',
        '2. Copie o `accessToken` e clique em **Authorize**.',
        '',
        'Rotas marcadas como **públicas** aceitam token opcional (com token, a resposta traz o contexto do usuário).',
        '',
        '### Erros',
        'Sempre no formato `ErrorResponseDto`: `{ statusCode, code, message, details?, path, timestamp, requestId }`.',
        'Faça asserções pelo **`code`** (estável); `message` é texto para humanos.',
        '',
        '| Status | Significado |',
        '|---|---|',
        '| 400 | Dados inválidos (`details` lista os campos) |',
        '| 401 | Não autenticado / credenciais inválidas |',
        '| 403 | Autenticado, mas sem permissão |',
        '| 404 | Não existe ou não é visível para você |',
        '| 409 | Conflito de estado ou unicidade |',
        '| 422 | Regra de negócio violada |',
        '| 429 | Limite de tentativas de login |',
        '',
        'Toda resposta traz o header `X-Request-Id`, que também aparece no log do servidor.',
        '',
        'As regras citadas como RNxx estão em `docs/regras-de-negocio.md`.',
      ].join('\n'),
    )
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'accessToken obtido no login' })
    .addTag('Auth', 'Cadastro, login e perfil do usuário logado')
    .addTag('Courses', 'Catálogo, ciclo de vida do curso e gestão de aulas')
    .addTag('Enrollments', 'Matrículas, progresso, notas e emissão de certificado')
    .addTag('Certificates', 'Verificação pública de certificados')
    .addTag('Categories', 'Categorias de cursos')
    .addTag('Users (admin)', 'Gestão de usuários (somente admin)')
    .addTag('Dashboard', 'Indicadores para admin e professor')
    .addTag('Health', 'Saúde da aplicação')
    .addTag('Testing', 'Apoio à automação (somente com ENABLE_TEST_ROUTES=true)')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    // IDs estáveis e únicos (ex.: Courses_publish): úteis para gerar clientes tipados a partir da spec.
    operationIdFactory: (controllerKey, methodKey) => `${controllerKey.replace(/Controller$/, '')}_${methodKey}`,
  });
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs/json',
    yamlDocumentUrl: 'docs/yaml',
    customSiteTitle: 'EduTrack API — Swagger',
    swaggerOptions: { persistAuthorization: true, displayRequestDuration: true, docExpansion: 'none', filter: true, tagsSorter: 'alpha' },
  });

  await app.listen(env.PORT);
  const log = new Logger('Bootstrap');
  log.log(`EduTrack API em http://localhost:${env.PORT}/api  |  Swagger: http://localhost:${env.PORT}/docs`);
  if (env.ENABLE_TEST_ROUTES) log.warn('Rotas de teste HABILITADAS (POST /api/testing/reset). Não use em produção.');
}
bootstrap();
