import { Module } from '@nestjs/common';
import { InvoiceManagementController } from './invoice-management.controller';
import { InvoiceManagementService } from './invoice-management.service';

@Module({
  controllers: [InvoiceManagementController],
  providers: [InvoiceManagementService],
  exports: [InvoiceManagementService],
})
export class InvoiceManagementModule {}
