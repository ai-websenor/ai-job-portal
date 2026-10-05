import { Module } from '@nestjs/common';
import { JobController } from './job.controller';
import { JobService } from './job.service';
import { EmployerJobService } from './employer-job.service';
import { SavedJobService } from './saved-job.service';
import { SubscriptionHelperModule } from '../subscription/subscription.module';
import { CategoryModule } from '../category/category.module';
import { MasterDataModule } from '../master-data/master-data.module';

@Module({
  imports: [SubscriptionHelperModule, CategoryModule, MasterDataModule],
  controllers: [JobController],
  providers: [JobService, EmployerJobService, SavedJobService],
  exports: [JobService],
})
export class JobModule {}
