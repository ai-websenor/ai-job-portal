import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AuthMiddleware } from './auth.middleware';

@Module({})
export class AuthMiddlewareModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Temporarily remove excludes to test if middleware runs at all
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}
