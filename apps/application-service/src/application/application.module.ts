import { Module } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { CandidateApplicationController } from './controllers/candidate-application.controller';
import { EmployerApplicationController } from './controllers/employer-application.controller';
import { ApplicationStatusController } from './controllers/application-status.controller';
import { DatabaseModule } from '../database/database.module';
import { EmployerCandidateController } from '../employer-candidate/employer-candidate.controller';
import { EmployerCandidateService } from '../employer-candidate/employer-candidate.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    CandidateApplicationController,
    EmployerApplicationController,
    ApplicationStatusController,
    EmployerCandidateController,
  ],
  providers: [ApplicationService, EmployerCandidateService],
  exports: [ApplicationService],
})
export class ApplicationModule {}
