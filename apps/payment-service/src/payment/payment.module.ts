import { Module, forwardRef } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { RazorpayProvider } from './providers/razorpay.provider';
import { StripeProvider } from './providers/stripe.provider';
import { SubscriptionModule } from '../subscription/subscription.module';
import { InvoiceModule } from '../invoice/invoice.module';

@Module({
  imports: [forwardRef(() => SubscriptionModule), forwardRef(() => InvoiceModule)],
  controllers: [PaymentController],
  providers: [PaymentService, RazorpayProvider, StripeProvider],
  exports: [PaymentService, RazorpayProvider, StripeProvider],
})
export class PaymentModule {}
