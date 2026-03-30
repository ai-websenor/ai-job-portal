import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(private readonly subscriptionService: SubscriptionService) {}

  /**
   * Runs every hour to:
   * 1. Expire active subscriptions that have passed their end date
   * 2. Activate scheduled subscriptions (downgrades) whose start date has arrived
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleSubscriptionLifecycle() {
    this.logger.log('Running subscription lifecycle cron...');

    try {
      const result = await this.subscriptionService.activateScheduledSubscriptions();
      this.logger.log(
        `Subscription cron complete: expired=${result.expired}, activated=${result.activated}`,
      );
    } catch (error: any) {
      this.logger.error(`Subscription cron failed: ${error.message}`, error.stack);
    }
  }
}
