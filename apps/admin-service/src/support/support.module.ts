import { Module } from '@nestjs/common';
import { SupportController, UserSupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({
  controllers: [SupportController, UserSupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
