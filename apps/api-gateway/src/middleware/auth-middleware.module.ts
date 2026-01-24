import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AuthMiddleware } from './auth.middleware';

@Module({})
export class AuthMiddlewareModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude('api/v1/health(.*)', 'api/v1/auth/(.*)', 'api/docs(.*)')
      .forRoutes('*');
  }
}
