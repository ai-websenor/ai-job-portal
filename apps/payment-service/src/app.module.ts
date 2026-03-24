import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '@ai-job-portal/common';
import { AwsModule } from '@ai-job-portal/aws';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { PaymentModule } from './payment/payment.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { InvoiceModule } from './invoice/invoice.module';
import { WebhookModule } from './webhook/webhook.module';

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
    AwsModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        region: config.get('AWS_REGION') || 'ap-south-1',
        accessKeyId: config.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY'),
        s3: {
          bucket: config.get('S3_BUCKET') || 'ai-job-portal-dev-uploads',
          endpoint: config.get('AWS_ENDPOINT'),
        },
        ses: {
          fromEmail: config.get('SES_FROM_EMAIL') || 'noreply@aijobportal.com',
          fromName: 'AI Job Portal',
        },
        sqs: {
          notificationQueueUrl: config.get('SQS_NOTIFICATION_QUEUE_URL') || '',
        },
      }),
      inject: [ConfigService],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    DatabaseModule,
    HealthModule,
    PaymentModule,
    SubscriptionModule,
    InvoiceModule,
    WebhookModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
