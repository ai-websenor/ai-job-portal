import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AwsModule } from '@ai-job-portal/aws';
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

    // AWS Services (Cognito for auth)
    AwsModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        region: config.get('AWS_REGION') || 'ap-south-1',
        accessKeyId: config.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY'),
        s3: {
          bucket: config.get('AWS_S3_BUCKET') || 'ai-job-portal-dev-uploads',
        },
        ses: {
          fromEmail: config.get('SES_FROM_EMAIL') || 'noreply@aijobportal.com',
          fromName: config.get('SES_FROM_NAME') || 'AI Job Portal',
        },
        sqs: {
          notificationQueueUrl: config.get('SQS_NOTIFICATION_QUEUE_URL') || '',
        },
        cognito: {
          userPoolId: config.get('COGNITO_USER_POOL_ID') || '',
          clientId: config.get('COGNITO_CLIENT_ID') || '',
          clientSecret: config.get('COGNITO_CLIENT_SECRET'),
          domain: config.get('COGNITO_DOMAIN') || '',
        },
        sns: {
          smsSenderId: config.get('SNS_SMS_SENDER_ID'),
        },
      }),
      inject: [ConfigService],
    }),

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
