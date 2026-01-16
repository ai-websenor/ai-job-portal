import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  PaymentProvider,
  CreateOrderParams,
  OrderResult,
  VerifyPaymentParams,
  RefundParams,
  RefundResult,
} from './payment-provider.interface';

@Injectable()
export class StripeProvider implements PaymentProvider {
  readonly name = 'stripe' as const;
  private readonly logger = new Logger(StripeProvider.name);
  private client: Stripe | null = null;
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get('STRIPE_SECRET_KEY');
    this.webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET') || '';

    if (secretKey) {
      this.client = new Stripe(secretKey, { apiVersion: '2023-10-16' });
    }
  }

  async createOrder(params: CreateOrderParams): Promise<OrderResult> {
    if (!this.client) {
      throw new Error('Stripe not configured');
    }

    // Create a PaymentIntent for Stripe
    const paymentIntent = await this.client.paymentIntents.create({
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      metadata: params.notes || {},
      automatic_payment_methods: { enabled: true },
    });

    return {
      orderId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      provider: 'stripe',
      providerData: {
        clientSecret: paymentIntent.client_secret,
        paymentIntent,
      },
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<boolean> {
    if (!this.client) {
      throw new Error('Stripe not configured');
    }

    // For Stripe, verify by fetching the payment intent status
    const paymentIntent = await this.client.paymentIntents.retrieve(params.orderId);
    return paymentIntent.status === 'succeeded';
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    if (!this.client) {
      throw new Error('Stripe not configured');
    }

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: params.paymentId,
    };

    if (params.amount) {
      refundParams.amount = params.amount;
    }
    if (params.reason) {
      refundParams.reason = 'requested_by_customer';
      refundParams.metadata = { reason: params.reason };
    }

    const refund = await this.client.refunds.create(refundParams);

    return {
      refundId: refund.id,
      paymentId: params.paymentId,
      amount: refund.amount || 0,
      status: refund.status || 'unknown',
    };
  }

  async getPaymentDetails(paymentId: string): Promise<Record<string, any>> {
    if (!this.client) {
      throw new Error('Stripe not configured');
    }

    return this.client.paymentIntents.retrieve(paymentId);
  }

  verifyWebhookSignature(payload: string, signature: string): Stripe.Event {
    if (!this.client) {
      throw new Error('Stripe not configured');
    }

    return this.client.webhooks.constructEvent(payload, signature, this.webhookSecret);
  }
}
