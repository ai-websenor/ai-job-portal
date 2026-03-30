import { Module } from '@nestjs/common';
import { JobChatController } from './job-chat.controller';
import { JobChatService } from './job-chat.service';

@Module({
  controllers: [JobChatController],
  providers: [JobChatService],
})
export class JobChatModule {}
