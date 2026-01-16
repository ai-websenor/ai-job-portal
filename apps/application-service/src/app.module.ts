import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { ApplicationModule } from './application/application.module';
import { StatusModule } from './status/status.module';
import { InterviewModule } from './interview/interview.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import queueConfig from './config/queue.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, queueConfig],
      envFilePath: ['.env', '../../.env'],
    }),
    DatabaseModule,
    ApplicationModule,
    StatusModule,
    InterviewModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    Reflector,
  ],
})
export class AppModule {}
