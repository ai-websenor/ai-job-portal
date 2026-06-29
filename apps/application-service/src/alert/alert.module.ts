import { Module } from '@nestjs/common';
import { AlertController } from './alert.controller';
import { AlertService } from './alert.service';
import { SubscriptionHelperModule } from '../subscription/subscription.module';

@Module({
  imports: [SubscriptionHelperModule],
  controllers: [AlertController],
  providers: [AlertService],
})
export class AlertModule {}
