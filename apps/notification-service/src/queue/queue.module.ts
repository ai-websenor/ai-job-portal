import { Module } from '@nestjs/common';
import { QueueProcessor } from './queue.processor';
import { EmailModule } from '../email/email.module';
import { SmsModule } from '../sms/sms.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [EmailModule, SmsModule, NotificationModule],
  providers: [QueueProcessor],
})
export class QueueModule {}
