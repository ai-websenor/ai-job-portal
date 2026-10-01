import { Module } from '@nestjs/common';
import { ApplicantScoreController } from './applicant-score.controller';
import { ApplicantScoreService } from './applicant-score.service';

@Module({
  controllers: [ApplicantScoreController],
  providers: [ApplicantScoreService],
  exports: [ApplicantScoreService],
})
export class ApplicantScoreModule {}
