import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ProxyModule } from './proxy/proxy.module';
import { HealthModule } from './health/health.module';
// import { AuthMiddlewareModule } from './middleware/auth-middleware.module'; // Disabled: Using Fastify hook in main.ts instead
import { DocsModule } from './docs/docs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.dev', '.env', '../../.env', '../../.env.dev'],
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const jwtSecret = config.get('JWT_SECRET');
        const isProduction = config.get('NODE_ENV') === 'production';

        if (isProduction && !jwtSecret) {
          throw new Error('JWT_SECRET is required in production environment');
        }

        return {
          secret: jwtSecret || 'dev-secret-change-in-production',
        };
      },
      inject: [ConfigService],
    }),
    ProxyModule,
    HealthModule,
    // AuthMiddlewareModule, // Disabled: Using Fastify hook in main.ts instead
    DocsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
