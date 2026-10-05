import { Module } from '@nestjs/common';
import {
  AdminCertificationController,
  AdminJobTitleController,
  AdminMasterDataController,
  AdminQualificationController,
} from './master-data.controller';
import { MasterDataService } from './master-data.service';

/**
 * Admin review queue for the job title / qualification / certification master
 * lists. Employers fill these tables by typing on the job form (job-service
 * captures anything new as `user-typed`); this is where an admin tidies,
 * promotes or deactivates what arrived.
 */
@Module({
  controllers: [
    AdminJobTitleController,
    AdminQualificationController,
    AdminCertificationController,
    AdminMasterDataController,
  ],
  providers: [MasterDataService],
  exports: [MasterDataService],
})
export class MasterDataModule {}
