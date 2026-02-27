import { Module } from '@nestjs/common';
import { MessagingGateway } from './messaging.gateway';
import { MessageModule } from '../message/message.module';
import { PresenceModule } from '../presence/presence.module';

@Module({
  imports: [MessageModule, PresenceModule],
  providers: [MessagingGateway],
  exports: [MessagingGateway],
})
export class GatewayModule {}
