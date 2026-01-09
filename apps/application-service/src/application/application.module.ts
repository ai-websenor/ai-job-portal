import {Module} from '@nestjs/common';
import {ApplicationService} from './application.service';
import {CandidateApplicationController} from './controllers/candidate-application.controller';
import {EmployerApplicationController} from './controllers/employer-application.controller';
import {ApplicationStatusController} from './controllers/application-status.controller';
import {DatabaseModule} from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [
    CandidateApplicationController,
    EmployerApplicationController,
    ApplicationStatusController,
  ],
  providers: [ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationModule {}
