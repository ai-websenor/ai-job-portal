import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '@ai-job-portal/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AwsModule } from '@ai-job-portal/aws';
import { NotificationModule } from './notification/notification.module';
import { PreferenceModule } from './preference/preference.module';
import { EmailModule } from './email/email.module';
import { SmsModule } from './sms/sms.module';
import { QueueModule } from './queue/queue.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.dev', '.env', '../../.env', '../../.env.dev'] }),
    ScheduleModule.forRoot(),
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
        s3: { bucket: config.get('S3_BUCKET') || 'ai-job-portal-dev-uploads' },
        ses: { fromEmail: config.get('SES_FROM_EMAIL') || 'noreply@aijobportal.com', fromName: 'AI Job Portal' },
        sqs: { notificationQueueUrl: config.get('SQS_NOTIFICATION_QUEUE_URL') || '' },
        sns: { smsSenderId: config.get('SNS_SMS_SENDER_ID') || 'JobPortal' },
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    NotificationModule,
    PreferenceModule,
    EmailModule,
    SmsModule,
    QueueModule,
    HealthModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
