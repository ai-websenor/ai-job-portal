import { Module } from '@nestjs/common';
import { VideoProfileController } from './video-profile.controller';
import { VideoProfileService } from './video-profile.service';

@Module({
  controllers: [VideoProfileController],
  providers: [VideoProfileService],
  exports: [VideoProfileService],
})
export class VideoProfileModule {}
