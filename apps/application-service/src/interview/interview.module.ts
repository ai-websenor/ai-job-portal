import { Module } from '@nestjs/common';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { InterviewTimeHelper } from './interview-time.helper';
import { InterviewConflictHelper } from './interview-conflict.helper';
import { InterviewVideoService } from './interview-video.service';
import { InterviewLookupHelper } from './interview-lookup.helper';
import { InterviewEnrichmentHelper } from './interview-enrichment.helper';
import { InterviewFeedbackService } from './interview-feedback.service';

@Module({
  controllers: [InterviewController],
  providers: [
    InterviewService,
    InterviewTimeHelper,
    InterviewConflictHelper,
    InterviewVideoService,
    InterviewLookupHelper,
    InterviewEnrichmentHelper,
    InterviewFeedbackService,
  ],
  exports: [InterviewService],
})
export class InterviewModule {}
