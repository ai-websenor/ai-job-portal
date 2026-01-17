import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '@ai-job-portal/common';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { RecommendationModule } from './recommendation/recommendation.module';
import { InteractionModule } from './interaction/interaction.module';
import { ModelModule } from './model/model.module';

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
    HealthModule,
    RecommendationModule,
    InteractionModule,
    ModelModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
