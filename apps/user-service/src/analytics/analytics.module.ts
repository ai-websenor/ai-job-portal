import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { ProfileModule } from '../profile/profile.module';
import { GrpcModule } from '../grpc/grpc.module';

@Module({
  imports: [ProfileModule, GrpcModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
