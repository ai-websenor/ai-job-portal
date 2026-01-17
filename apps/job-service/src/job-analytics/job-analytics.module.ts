import { Module } from '@nestjs/common';
import { JobAnalyticsController } from './job-analytics.controller';
import { JobAnalyticsService } from './job-analytics.service';

@Module({
  controllers: [JobAnalyticsController],
  providers: [JobAnalyticsService],
  exports: [JobAnalyticsService],
})
export class JobAnalyticsModule {}
