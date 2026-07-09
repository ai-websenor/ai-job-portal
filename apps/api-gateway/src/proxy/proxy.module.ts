import { Module } from '@nestjs/common';
import { ProxyController } from './proxy.controller';
import { ProxyService } from './proxy.service';
import { ProxySpecialService } from './proxy-special.service';

@Module({
  controllers: [ProxyController],
  providers: [ProxyService, ProxySpecialService],
})
export class ProxyModule {}
