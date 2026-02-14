import { Module } from '@nestjs/common';
import { QueueProcessor } from './queue.processor';
import { EmailModule } from '../email/email.module';
import { SmsModule } from '../sms/sms.module';
import { NotificationModule } from '../notification/notification.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [EmailModule, SmsModule, NotificationModule, PushModule],
  providers: [QueueProcessor],
})
export class QueueModule {}
