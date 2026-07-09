import { Module } from '@nestjs/common';
import { ThreadController } from './thread.controller';
import { ThreadService } from './thread.service';
import { ThreadResolutionHelper } from './thread-resolution.helper';
import { ThreadAccessHelper } from './thread-access.helper';
import { PresenceModule } from '../presence/presence.module';

@Module({
  imports: [PresenceModule],
  controllers: [ThreadController],
  providers: [ThreadService, ThreadResolutionHelper, ThreadAccessHelper],
  exports: [ThreadService],
})
export class ThreadModule {}
