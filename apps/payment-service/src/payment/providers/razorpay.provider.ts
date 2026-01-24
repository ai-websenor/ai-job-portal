import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import {
  PaymentProvider,
  CreateOrderParams,
  OrderResult,
  VerifyPaymentParams,
  RefundParams,
  RefundResult,
} from './payment-provider.interface';

@Injectable()
export class RazorpayProvider implements PaymentProvider {
  readonly name = 'razorpay' as const;
  private readonly logger = new Logger(RazorpayProvider.name);
  private client: Razorpay | null = null;
  private readonly keySecret: string;

  constructor(private readonly configService: ConfigService) {
    const keyId = this.configService.get('RAZORPAY_KEY_ID');
    this.keySecret = this.configService.get('RAZORPAY_KEY_SECRET') || '';

    if (keyId && this.keySecret) {
      this.client = new Razorpay({
        key_id: keyId,
        key_secret: this.keySecret,
      });
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
