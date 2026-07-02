import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { SecretsConfigService } from '../../config/secrets-config.service';
import {
  PaymentProvider,
  CreateOrderParams,
  OrderResult,
  VerifyPaymentParams,
  RefundParams,
  RefundResult,
} from './payment-provider.interface';

@Injectable()
export class RazorpayProvider implements PaymentProvider, OnModuleInit {
  readonly name = 'razorpay' as const;
  private readonly logger = new Logger(RazorpayProvider.name);
  private client: Razorpay | null = null;
  private keySecret = '';

  constructor(private readonly secrets: SecretsConfigService) {}

  /**
   * Resolve credentials once at boot: admin Secret Manager vault first, then
   * env fallback. A key saved in the admin panel applies on the next restart.
   */
  async onModuleInit(): Promise<void> {
    const keyId = await this.secrets.get('RAZORPAY_KEY_ID');
    this.keySecret = (await this.secrets.get('RAZORPAY_KEY_SECRET')) || '';

    if (keyId && this.keySecret) {
      this.client = new Razorpay({
        key_id: keyId,
        key_secret: this.keySecret,
      });
      this.logger.log('Razorpay client initialized');
    } else {
      this.logger.warn('Razorpay credentials not set (vault or env) — provider disabled');
    }
  }

  async createOrder(params: CreateOrderParams): Promise<OrderResult> {
    if (!this.client) {
      throw new Error('Razorpay not configured');
    }

    const order = await this.client.orders.create({
      amount: params.amount,
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes,
    });

    return {
      orderId: order.id,
      amount: order.amount as number,
      currency: order.currency,
      status: order.status,
      provider: 'razorpay',
      providerData: order,
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<boolean> {
    const body = params.orderId + '|' + params.paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex');

    return expectedSignature === params.signature;
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    if (!this.client) {
      throw new Error('Razorpay not configured');
    }

    const refundData: any = {};
    if (params.amount) {
      refundData.amount = params.amount;
    }
    if (params.reason) {
      refundData.notes = { reason: params.reason };
    }

    const refund = await this.client.payments.refund(params.paymentId, refundData);

    return {
      refundId: refund.id,
      paymentId: refund.payment_id,
      amount: refund.amount as number,
      status: refund.status,
    };
  }

  async getPaymentDetails(paymentId: string): Promise<Record<string, any>> {
    if (!this.client) {
      throw new Error('Razorpay not configured');
    }

    return this.client.payments.fetch(paymentId);
  }
}
