import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AwsModule } from '@ai-job-portal/aws';
import { JwtStrategy } from '@ai-job-portal/common';
import { CandidateModule } from './candidate/candidate.module';
import { EmployerModule } from './employer/employer.module';
import { ResumeModule } from './resume/resume.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { CertificationModule } from './certification/certification.module';
import { SkillModule } from './skill/skill.module';
import { LanguageModule } from './language/language.module';
import { ProjectModule } from './project/project.module';
import { PreferenceModule } from './preference/preference.module';
import { DocumentModule } from './document/document.module';
import { CompanyModule } from './company/company.module';
import { TeamModule } from './team/team.module';
import { CareerPageModule } from './career-page/career-page.module';
import { MediaModule } from './media/media.module';
import { TestimonialModule } from './testimonial/testimonial.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.dev', '.env', '../../.env', '../../.env.dev'] }),
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
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    CandidateModule,
    EmployerModule,
    ResumeModule,
    CertificationModule,
    SkillModule,
    LanguageModule,
    ProjectModule,
    PreferenceModule,
    DocumentModule,
    CompanyModule,
    TeamModule,
    CareerPageModule,
    MediaModule,
    TestimonialModule,
    HealthModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
