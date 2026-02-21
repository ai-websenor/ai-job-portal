import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '@ai-job-portal/common';
import { AwsModule } from '@ai-job-portal/aws';
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
import { CompanyModule } from './company/company.module';
import { TeamModule } from './team/team.module';
import { MediaModule } from './media/media.module';
import { CareerPageModule } from './career-page/career-page.module';
import { TestimonialModule } from './testimonial/testimonial.module';
import { ResumeTemplatesModule } from './resume-templates/resume-templates.module';
import { RbacModule } from './rbac/rbac.module';
import { AvatarModule } from './avatar/avatar.module';
import { VideoModerationModule } from './video-moderation/video-moderation.module';

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
    // AWS Services (Cognito for employer registration)
    AwsModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        region: config.get('AWS_REGION') || 'ap-south-1',
        accessKeyId: config.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY'),
        endpoint: config.get('AWS_ENDPOINT'),
        s3: {
          bucket: config.get('S3_BUCKET') || 'ai-job-portal-dev-uploads',
          endpoint: config.get('AWS_ENDPOINT'),
        },
        ses: {
          fromEmail: config.get('SES_FROM_EMAIL') || 'noreply@aijobportal.com',
          fromName: config.get('SES_FROM_NAME') || 'AI Job Portal',
        },
        sqs: {
          notificationQueueUrl: config.get('SQS_NOTIFICATION_QUEUE_URL') || '',
          endpoint: config.get('AWS_ENDPOINT'),
        },
        cognito: {
          userPoolId: config.get('COGNITO_USER_POOL_ID') || '',
          clientId: config.get('COGNITO_CLIENT_ID') || '',
          clientSecret: config.get('COGNITO_CLIENT_SECRET'),
          domain: config.get('COGNITO_DOMAIN') || '',
        },
      }),
      inject: [ConfigService],
    }),
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
    CompanyModule,
    TeamModule,
    MediaModule,
    CareerPageModule,
    TestimonialModule,
    ResumeTemplatesModule,
    RbacModule,
    AvatarModule,
    VideoModerationModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
