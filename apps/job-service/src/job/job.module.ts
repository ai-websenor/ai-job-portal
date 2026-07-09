import { Module } from '@nestjs/common';
import { JobController } from './job.controller';
import { JobService } from './job.service';
import { EmployerJobService } from './employer-job.service';
import { SavedJobService } from './saved-job.service';
import { SubscriptionHelperModule } from '../subscription/subscription.module';

@Module({
  imports: [SubscriptionHelperModule],
  controllers: [JobController],
  providers: [JobService, EmployerJobService, SavedJobService],
  exports: [JobService],
})
export class JobModule {}
