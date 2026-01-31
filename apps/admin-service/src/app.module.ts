import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '@ai-job-portal/common';
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
import { EmployerManagementModule } from './employer-management/employer-management.module';

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
    EmployerManagementModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
