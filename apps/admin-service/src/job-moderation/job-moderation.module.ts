import { Module } from '@nestjs/common';
import { JobModerationService } from './job-moderation.service';
import { JobModerationController } from './job-moderation.controller';

@Module({
  controllers: [JobModerationController],
  providers: [JobModerationService],
  exports: [JobModerationService],
})
export class JobModerationModule {}
