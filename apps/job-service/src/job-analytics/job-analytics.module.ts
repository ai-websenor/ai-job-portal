import { Module } from '@nestjs/common';
import { JobAnalyticsController } from './job-analytics.controller';
import { JobRedirectController } from './job-redirect.controller';
import { JobAnalyticsService } from './job-analytics.service';

@Module({
  controllers: [JobAnalyticsController, JobRedirectController],
  providers: [JobAnalyticsService],
  exports: [JobAnalyticsService],
})
export class JobAnalyticsModule {}
