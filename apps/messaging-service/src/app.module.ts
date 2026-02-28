import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '@ai-job-portal/common';
import { AwsModule } from '@ai-job-portal/aws';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { ThreadModule } from './thread/thread.module';
import { MessageModule } from './message/message.module';
import { ChatModule } from './chat/chat.module';
import { SearchModule } from './search/search.module';
import { PresenceModule } from './presence/presence.module';
import { GatewayModule } from './gateway/gateway.module';
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
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    RedisModule,
    PresenceModule,
    ThreadModule,
    MessageModule,
    ChatModule,
    SearchModule,
    GatewayModule,
    HealthModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
