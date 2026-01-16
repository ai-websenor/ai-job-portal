import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { RazorpayProvider } from './providers/razorpay.provider';
import { StripeProvider } from './providers/stripe.provider';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, RazorpayProvider, StripeProvider],
  exports: [PaymentService, RazorpayProvider, StripeProvider],
})
export class PaymentModule {}
