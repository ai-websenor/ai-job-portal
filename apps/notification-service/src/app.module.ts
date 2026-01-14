import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import appConfig from './config/app.config';
import mailConfig from './config/mail.config';
import queueConfig from './config/queue.config';
import { NotificationModule } from './modules/notification/notification.module';
import { EmailModule } from './modules/email/email.module';
import { QueueModule } from './modules/queue/queue.module';
import { NotificationLogsModule } from './modules/notification-logs/notification-logs.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, mailConfig, queueConfig],
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Feature Modules
    NotificationModule,
    EmailModule,
    QueueModule,
    NotificationLogsModule,
    HealthModule,
  ],
})
export class AppModule {}
