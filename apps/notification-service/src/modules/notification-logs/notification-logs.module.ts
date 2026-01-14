import { Module } from '@nestjs/common';
import { NotificationLogsService } from './notification-logs.service';

@Module({
  providers: [NotificationLogsService],
  exports: [NotificationLogsService],
})
export class NotificationLogsModule {}
