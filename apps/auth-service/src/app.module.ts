import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './user/user.module';
import { SessionModule } from './session/session.module';
import { AuthModule } from './auth/auth.module';
import { GrpcModule } from './grpc/grpc.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env', '../../.env'],
    }),

    // Scheduling
    ScheduleModule.forRoot(),

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Database
    DatabaseModule,

    // Feature Modules
    UserModule,
    SessionModule,
    AuthModule,
    GrpcModule,
  ],
})
export class AppModule {}
