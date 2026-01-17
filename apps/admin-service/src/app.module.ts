import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { UserManagementModule } from './user-management/user-management.module';
import { JobModerationModule } from './job-moderation/job-moderation.module';
import { ContentModule } from './content/content.module';
import { SettingsModule } from './settings/settings.module';
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';
import { SupportModule } from './support/support.module';
import { BlogModule } from './blog/blog.module';
import { AnnouncementModule } from './announcement/announcement.module';
import { BannerModule } from './banner/banner.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RedisModule,
    HealthModule,
    UserManagementModule,
    JobModerationModule,
    ContentModule,
    SettingsModule,
    ReportsModule,
    AuditModule,
    SupportModule,
    BlogModule,
    AnnouncementModule,
    BannerModule,
  ],
})
export class AppModule {}
