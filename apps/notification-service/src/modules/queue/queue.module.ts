import { Module } from '@nestjs/common';
import { QueueConsumer } from './queue.consumer';

@Module({
  providers: [QueueConsumer],
  exports: [QueueConsumer],
})
export class QueueModule {}
