import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '@ai-job-portal/common';
import { AwsModule } from '@ai-job-portal/aws';
import { VideoConferencingModule } from '@ai-job-portal/video-conferencing';
import { ApplicationModule } from './application/application.module';
import { InterviewModule } from './interview/interview.module';
import { OfferModule } from './offer/offer.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.dev', '.env', '../../.env', '../../.env.dev'],
    }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET') || 'dev-secret-change-in-production',
      }),
      inject: [ConfigService],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    AwsModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        region: config.get('AWS_REGION') || 'ap-south-1',
        accessKeyId: config.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY'),
        endpoint: config.get('AWS_ENDPOINT_URL'),
        s3: { bucket: config.get('S3_BUCKET') || 'ai-job-portal-dev-uploads' },
        ses: {
          fromEmail: config.get('SES_FROM_EMAIL') || 'openai.andria@yopmail.com',
          fromName: 'AI Job Portal',
        },
        sqs: {
          notificationQueueUrl: config.get('SQS_NOTIFICATION_QUEUE_URL') || '',
          endpoint: config.get('AWS_ENDPOINT_URL'),
        },
        cognito: config.get('COGNITO_USER_POOL_ID')
          ? {
              userPoolId: config.get('COGNITO_USER_POOL_ID')!,
              clientId: config.get('COGNITO_CLIENT_ID')!,
              clientSecret: config.get('COGNITO_CLIENT_SECRET'),
              domain: 'ai-job-portal-dev',
            }
          : undefined,
      }),
      inject: [ConfigService],
    }),
    VideoConferencingModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        mockMode: config.get('MOCK_VIDEO_CONFERENCING') === 'true',
        zoom: config.get('ZOOM_CLIENT_ID')
          ? {
              accountId: config.get('ZOOM_ACCOUNT_ID')!,
              clientId: config.get('ZOOM_CLIENT_ID')!,
              clientSecret: config.get('ZOOM_CLIENT_SECRET')!,
            }
          : undefined,
        teams: config.get('TEAMS_APP_ID')
          ? {
              tenantId: config.get('TEAMS_TENANT_ID')!,
              appId: config.get('TEAMS_APP_ID')!,
              appSecret: config.get('TEAMS_APP_PASSWORD')!,
            }
          : undefined,
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    ApplicationModule,
    InterviewModule,
    OfferModule,
    HealthModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
