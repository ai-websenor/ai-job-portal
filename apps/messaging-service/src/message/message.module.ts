import { Module, forwardRef } from '@nestjs/common';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  // forwardRef: the gateway needs MessageService (socket sends) and the REST
  // controller needs MessagingGateway (real-time broadcast of REST sends)
  imports: [forwardRef(() => GatewayModule)],
  controllers: [MessageController],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
