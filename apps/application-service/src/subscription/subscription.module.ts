import { Module } from '@nestjs/common';
import { SubscriptionHelper } from './subscription.helper';

@Module({
  providers: [SubscriptionHelper],
  exports: [SubscriptionHelper],
})
export class SubscriptionHelperModule {}
