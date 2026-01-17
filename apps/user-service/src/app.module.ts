import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, Reflector } from '@nestjs/core';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { DatabaseModule } from './database/database.module';
import { StorageModule } from './storage/storage.module';
import { GrpcModule } from './grpc/grpc.module';
import { ProfileModule } from './profile/profile.module';
import { WorkExperienceModule } from './work-experience/work-experience.module';
import { EducationModule } from './education/education.module';
import { SkillsModule } from './skills/skills.module';
import { CertificationsModule } from './certifications/certifications.module';
import { ResumesModule } from './resumes/resumes.module';
import { PreferencesModule } from './preferences/preferences.module';
import { DocumentsModule } from './documents/documents.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { EmployerModule } from './employer/employer.module';
import { UserPreferencesModule } from './user-preferences/user-preferences.module';
import { CandidateModule } from './candidate/candidate.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './common/strategies/jwt.strategy';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      envFilePath: ['.env.local', '.env', '../../.env'],
    }),
    PassportModule,

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Infrastructure
    DatabaseModule,
    StorageModule,
    GrpcModule,

    // Feature Modules
    OnboardingModule,
    ProfileModule,
    WorkExperienceModule,
    EducationModule,
    SkillsModule,
    CertificationsModule,
    ResumesModule,
    PreferencesModule,
    DocumentsModule,
    AnalyticsModule,
    EmployerModule,
    UserPreferencesModule,
    CandidateModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    JwtStrategy,
    Reflector,
  ],
})
export class AppModule {}
