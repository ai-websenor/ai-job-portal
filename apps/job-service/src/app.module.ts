import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '@ai-job-portal/common';
import { JobModule } from './job/job.module';
import { CategoryModule } from './category/category.module';
import { SkillModule } from './skill/skill.module';
import { SearchModule } from './search/search.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { CommonServicesModule } from './common-services/common-services.module';
import { HealthModule } from './health/health.module';
import { ScreeningQuestionModule } from './screening-question/screening-question.module';
import { SavedSearchModule } from './saved-search/saved-search.module';
import { JobAnalyticsModule } from './job-analytics/job-analytics.module';

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
    DatabaseModule,
    RedisModule,
    CommonServicesModule,
    JobModule,
    CategoryModule,
    SkillModule,
    SearchModule,
    ScreeningQuestionModule,
    SavedSearchModule,
    JobAnalyticsModule,
    HealthModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
