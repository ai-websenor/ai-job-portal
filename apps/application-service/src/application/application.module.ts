import { Module } from '@nestjs/common';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { ApplicationEnrichmentHelper } from './application-enrichment.helper';
import { ApplicationQueryService } from './application-query.service';
import { ApplicationHistoryService } from './application-history.service';
import { ApplicationAnalyticsService } from './application-analytics.service';
import { SubscriptionHelperModule } from '../subscription/subscription.module';

@Module({
  imports: [SubscriptionHelperModule],
  controllers: [ApplicationController],
  providers: [
    ApplicationService,
    ApplicationEnrichmentHelper,
    ApplicationQueryService,
    ApplicationHistoryService,
    ApplicationAnalyticsService,
  ],
  exports: [ApplicationService],
})
export class ApplicationModule {}
