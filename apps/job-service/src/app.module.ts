import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JobModule } from './job/job.module';
import { CategoryModule } from './category/category.module';
import { SkillModule } from './skill/skill.module';
import { SearchModule } from './search/search.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.dev', '.env'] }),
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
    JobModule,
    CategoryModule,
    SkillModule,
    SearchModule,
    HealthModule,
  ],
})
export class AppModule {}
