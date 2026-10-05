import { Module } from '@nestjs/common';
import {
  CertificationController,
  JobTitleController,
  QualificationController,
} from './master-data.controller';
import { MasterDataService } from './master-data.service';

/**
 * Master lists behind the job title / qualification / certification fields on
 * the employer job form.
 *
 * Exported so `JobModule` can call `captureFromJob()` when a job is saved —
 * a value that matches nothing becomes a `user-typed` row and reaches the
 * admin review queue in admin-service.
 */
@Module({
  controllers: [JobTitleController, QualificationController, CertificationController],
  providers: [MasterDataService],
  exports: [MasterDataService],
})
export class MasterDataModule {}
