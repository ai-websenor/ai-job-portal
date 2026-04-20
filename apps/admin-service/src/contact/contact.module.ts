import { Module } from '@nestjs/common';
import { ContactService } from './contact.service';
import { PublicContactController, AdminContactController } from './contact.controller';

@Module({
  controllers: [PublicContactController, AdminContactController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule {}
