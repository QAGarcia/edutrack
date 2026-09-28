import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { existsSync } from 'fs';
import { join } from 'path';
import { AuthGuard } from './common/auth/auth.guard';
import { HttpExceptionFilter } from './common/errors/http-exception.filter';
import { RequestContextMiddleware } from './common/http/request-context.middleware';
import { env } from './config/env';
import { dataSourceOptions } from './database/data-source';
import { entities } from './database/entities';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { CategoriesController, CategoriesService } from './modules/categories/categories';
import { CertificatesController, CertificatesService } from './modules/certificates/certificates';
import { CoursesController } from './modules/courses/courses.controller';
import { CoursesService } from './modules/courses/courses.service';
import { DashboardController, DashboardService } from './modules/dashboard/dashboard';
import { EnrollmentsController } from './modules/enrollments/enrollments.controller';
import { EnrollmentsService } from './modules/enrollments/enrollments.service';
import { HealthController } from './modules/health/health';
import { LessonsService } from './modules/lessons/lessons.service';
import { TestingController } from './modules/testing/testing';
import { UsersController } from './modules/users/users.controller';
import { UsersService } from './modules/users/users.service';

// Frontend compilado (apps/web/dist). Em desenvolvimento o Vite serve o frontend.
const WEB_DIST = join(__dirname, '..', '..', 'web', 'dist');

@Module({
  imports: [
    TypeOrmModule.forRoot({ ...dataSourceOptions, migrationsRun: true }),
    TypeOrmModule.forFeature(entities),
    JwtModule.register({ global: true, secret: env.JWT_SECRET, signOptions: { expiresIn: env.JWT_EXPIRES_IN as never } }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1000 }]),
    ...(existsSync(WEB_DIST) ? [ServeStaticModule.forRoot({ rootPath: WEB_DIST, exclude: ['/api/{*path}', '/docs/{*path}'] })] : []),
  ],
  controllers: [
    AuthController, UsersController, CategoriesController, CoursesController, EnrollmentsController,
    CertificatesController, DashboardController, HealthController,
    ...(env.ENABLE_TEST_ROUTES ? [TestingController] : []),
  ],
  providers: [
    AuthService, UsersService, CategoriesService, CoursesService, LessonsService, EnrollmentsService,
    CertificatesService, DashboardService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*path');
  }
}
