import { Module } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { PaymentModule } from '../payment/payment.module';
import { InvoiceModule } from '../invoice/invoice.module';

@Module({
  imports: [PaymentModule, InvoiceModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
