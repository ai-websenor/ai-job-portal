import { Module } from '@nestjs/common';
import { JobController } from './job.controller';
import { JobService } from './job.service';
import { SubscriptionHelperModule } from '../subscription/subscription.module';

@Module({
  imports: [SubscriptionHelperModule],
  controllers: [JobController],
  providers: [JobService],
  exports: [JobService],
})
export class JobModule {}
