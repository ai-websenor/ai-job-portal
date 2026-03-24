import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import * as crypto from 'crypto';
import { Database, payments, transactionHistory } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { StripeProvider } from '../payment/providers/stripe.provider';
import { InvoiceService } from '../invoice/invoice.service';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly razorpayWebhookSecret: string;

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly configService: ConfigService,
    private readonly stripeProvider: StripeProvider,
    private readonly invoiceService: InvoiceService,
    private readonly subscriptionService: SubscriptionService,
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
      case 'payment_intent.canceled':
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
      where: eq(payments.gatewayOrderId, orderId),
    });

    if (!payment) {
      this.logger.warn(`Payment not found for order: ${orderId}`);
      return;
    }

    if (payment.status === 'success') {
      this.logger.log(`Payment already completed: ${payment.id}`);
      return;
    }

    await this.db
      .update(payments)
      .set({
        status: 'success',
        gatewayPaymentId: paymentId,
        updatedAt: new Date(),
      } as any)
      .where(eq(payments.id, payment.id));

    // Log to transaction history for audit trail
    await this.db
      .insert(transactionHistory)
      .values({
        paymentId: payment.id,
        status: 'success',
        message: `Payment captured via ${provider} webhook`,
        gatewayResponse: JSON.stringify(paymentData),
      } as any)
      .catch((err: any) => {
        this.logger.warn(`Failed to log transaction history: ${err.message}`);
      });

    this.logger.log(`Payment captured: ${payment.id}`);

    // Activate subscription if payment is for a plan purchase
    try {
      const metadata =
        typeof payment.metadata === 'string' ? JSON.parse(payment.metadata) : payment.metadata;
      const planId = metadata?.planId;

      if (planId && payment.userId) {
        await this.subscriptionService.activateSubscription(payment.userId, planId, payment.id);
        this.logger.log(`Subscription activated via webhook for payment: ${payment.id}`);
      }
    } catch (err: any) {
      this.logger.error(`Failed to activate subscription via webhook: ${err.message}`);
    }

    // Generate invoice for successful payment
    try {
      const invoice = await this.invoiceService.generateInvoice(payment.id);
      this.logger.log(
        `Invoice generated via webhook: ${invoice.data.invoiceNumber} for payment: ${payment.id}`,
      );
    } catch (err: any) {
      // Invoice failure should NOT block payment success — can be retried later
      this.logger.error(`Failed to generate invoice for payment ${payment.id}: ${err.message}`);
    }
  }

  private async handlePaymentFailed(paymentData: any, provider: 'razorpay' | 'stripe') {
    const orderId = provider === 'razorpay' ? paymentData.order_id : paymentData.id;

    const payment = await (this.db.query as any).payments.findFirst({
      where: eq(payments.gatewayOrderId, orderId),
    });

    if (!payment) return;

    // Don't overwrite a success status (webhook ordering edge case)
    if (payment.status === 'success') {
      this.logger.log(`Payment already succeeded, ignoring failed event: ${payment.id}`);
      return;
    }

    await this.db
      .update(payments)
      .set({
        status: 'failed',
        updatedAt: new Date(),
      } as any)
      .where(eq(payments.id, payment.id));

    // Log to transaction history for audit trail
    await this.db
      .insert(transactionHistory)
      .values({
        paymentId: payment.id,
        status: 'failed',
        message: `Payment failed via ${provider} webhook`,
        gatewayResponse: JSON.stringify(paymentData),
      } as any)
      .catch((err: any) => {
        this.logger.warn(`Failed to log transaction history: ${err.message}`);
      });

    this.logger.log(`Payment failed: ${payment.id}`);
  }
}
