import { Module } from '@nestjs/common';
import { JobAnalyticsController } from './job-analytics.controller';
import { JobRedirectController } from './job-redirect.controller';
import { JobAnalyticsService } from './job-analytics.service';
import { JobDeepLinkService } from './job-deep-link.service';

@Module({
  controllers: [JobAnalyticsController, JobRedirectController],
  providers: [JobAnalyticsService, JobDeepLinkService],
  exports: [JobAnalyticsService],
})
export class JobAnalyticsModule {}
