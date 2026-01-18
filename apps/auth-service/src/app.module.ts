import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { OAuthModule } from './oauth/oauth.module';
import { TwoFactorModule } from './two-factor/two-factor.module';
import { SessionModule } from './session/session.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';

// Disable throttling for tests
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.THROTTLE_DISABLED === 'true';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.dev', '.env', '../../.env', '../../.env.dev'],
    }),

    // Rate limiting (disabled for tests)
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: isTestEnv ? 10000 : 100, // High limit for tests
      },
    ]),

    // JWT
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET') || 'dev-secret-change-in-production',
        signOptions: {
          expiresIn: config.get('JWT_ACCESS_EXPIRY') || '15m',
        },
      }),
      inject: [ConfigService],
    }),

    // Passport
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Feature modules
    DatabaseModule,
    RedisModule,
    AuthModule,
    OAuthModule,
    TwoFactorModule,
    SessionModule,
    HealthModule,
  ],
  providers: isTestEnv
    ? [] // No throttle guard in test mode
    : [
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
})
export class AppModule {}
