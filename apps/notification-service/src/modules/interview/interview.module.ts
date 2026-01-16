import { Module } from '@nestjs/common';
import { InterviewConsumer } from './interview.consumer';
import { NotificationLogsModule } from '../notification-logs/notification-logs.module';

@Module({
  imports: [NotificationLogsModule],
  controllers: [InterviewConsumer],
})
export class InterviewModule {}
