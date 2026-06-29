import { Module, forwardRef } from '@nestjs/common';
import { MessagingGateway } from './messaging.gateway';
import { MessageModule } from '../message/message.module';
import { PresenceModule } from '../presence/presence.module';

@Module({
  imports: [forwardRef(() => MessageModule), PresenceModule],
  providers: [MessagingGateway],
  exports: [MessagingGateway],
})
export class GatewayModule {}
