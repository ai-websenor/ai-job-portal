import { Module } from '@nestjs/common';
import { VideoModerationController } from './video-moderation.controller';
import { VideoModerationService } from './video-moderation.service';

@Module({
  controllers: [VideoModerationController],
  providers: [VideoModerationService],
})
export class VideoModerationModule {}
