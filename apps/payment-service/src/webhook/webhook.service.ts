import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import * as crypto from 'crypto';
import { Database, payments, subscriptions, users } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { StripeProvider } from '../payment/providers/stripe.provider';
import { InvoiceService } from '../invoice/invoice.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly razorpayWebhookSecret: string;

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly configService: ConfigService,
    private readonly stripeProvider: StripeProvider,
    private readonly invoiceService: InvoiceService,
  ) {
    this.razorpayWebhookSecret = this.configService.get('RAZORPAY_WEBHOOK_SECRET') || '';
  }

  async handleRazorpayWebhook(payload: any, signature: string) {
    const expectedSignature = crypto
      .createHmac('sha256', this.razorpayWebhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = payload.event;
    this.logger.log(`Razorpay webhook: ${event}`);

    switch (event) {
      case 'payment.captured':
        await this.handlePaymentCaptured(payload.payload.payment.entity, 'razorpay');
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(payload.payload.payment.entity, 'razorpay');
        break;
      default:
        this.logger.log(`Unhandled Razorpay event: ${event}`);
    }

    return { received: true };
  }

  async handleStripeWebhook(payload: string, signature: string) {
    let event;

    try {
      event = this.stripeProvider.verifyWebhookSignature(payload, signature);
    } catch (err: any) {
      this.logger.error(`Stripe webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentCaptured(event.data.object, 'stripe');
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object, 'stripe');
        break;
      default:
        this.logger.log(`Unhandled Stripe event: ${event.type}`);
    }

    return { received: true };
  }

  private async handlePaymentCaptured(paymentData: any, provider: 'razorpay' | 'stripe') {
    const orderId = provider === 'razorpay' ? paymentData.order_id : paymentData.id;
    const paymentId = provider === 'razorpay' ? paymentData.id : paymentData.id;

    const payment = await (this.db.query as any).payments.findFirst({
      where: eq(payments.providerOrderId, orderId),
    });

    if (!payment) {
      this.logger.warn(`Payment not found for order: ${orderId}`);
      return;
    }

    if (payment.status === 'completed') {
      this.logger.log(`Payment already completed: ${payment.id}`);
      return;
    }

    await this.db.update(payments)
      .set({
        status: 'completed',
        providerPaymentId: paymentId,
        paidAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(payments.id, payment.id));

    this.logger.log(`Payment captured: ${payment.id}`);
  }

  private async handlePaymentFailed(paymentData: any, provider: 'razorpay' | 'stripe') {
    const orderId = provider === 'razorpay' ? paymentData.order_id : paymentData.id;

    const payment = await (this.db.query as any).payments.findFirst({
      where: eq(payments.providerOrderId, orderId),
    });

    if (!payment) return;

    await this.db.update(payments)
      .set({
        status: 'failed',
        failureReason: paymentData.error_description || paymentData.last_payment_error?.message,
        failedAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(payments.id, payment.id));

    this.logger.log(`Payment failed: ${payment.id}`);
  }
}
