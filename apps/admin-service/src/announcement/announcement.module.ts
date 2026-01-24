import { Module } from '@nestjs/common';
import { AdminAnnouncementController, PublicAnnouncementController } from './announcement.controller';
import { AnnouncementService } from './announcement.service';

@Module({
  controllers: [AdminAnnouncementController, PublicAnnouncementController],
  providers: [AnnouncementService],
  exports: [AnnouncementService],
})
export class AnnouncementModule {}
