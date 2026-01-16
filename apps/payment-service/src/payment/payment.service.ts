import { Injectable, Inject, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { Database, payments, subscriptions, users } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { RazorpayProvider } from './providers/razorpay.provider';
import { StripeProvider } from './providers/stripe.provider';
import { CreateOrderDto, VerifyPaymentDto, RefundDto, ListTransactionsDto } from './dto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly razorpayProvider: RazorpayProvider,
    private readonly stripeProvider: StripeProvider,
  ) {}

  private getProvider(name: 'razorpay' | 'stripe') {
    return name === 'razorpay' ? this.razorpayProvider : this.stripeProvider;
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    const provider = this.getProvider(dto.provider);

    const order = await provider.createOrder({
      amount: dto.amount,
      currency: dto.currency,
      receipt: `order_${Date.now()}`,
      notes: { userId, type: dto.type },
    });

    const [payment] = await this.db.insert(payments).values({
      userId,
      amount: dto.amount,
      currency: dto.currency,
      status: 'pending',
      provider: dto.provider as any,
      providerOrderId: order.orderId,
      description: dto.description,
      metadata: JSON.stringify(order.providerData),
    } as any).returning();

    return {
      paymentId: payment.id,
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      provider: dto.provider,
      ...order.providerData,
    };
  }

  async verifyPayment(userId: string, dto: VerifyPaymentDto) {
    const provider = this.getProvider(dto.provider);

    const payment = await (this.db.query as any).payments.findFirst({
      where: and(
        eq(payments.providerOrderId, dto.orderId),
        eq(payments.userId, userId),
        eq(payments.status, 'pending'),
      ),
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const isValid = await provider.verifyPayment({
      orderId: dto.orderId,
      paymentId: dto.paymentId,
      signature: dto.signature,
    });

    if (!isValid) {
      await this.db.update(payments)
        .set({ status: 'failed', updatedAt: new Date() } as any)
        .where(eq(payments.id, payment.id));

      throw new BadRequestException('Payment verification failed');
    }

    const [updated] = await this.db.update(payments)
      .set({
        status: 'completed',
        providerPaymentId: dto.paymentId,
        paidAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(payments.id, payment.id))
      .returning();

    return { success: true, payment: updated };
  }

  async refund(userId: string, dto: RefundDto) {
    const payment = await (this.db.query as any).payments.findFirst({
      where: and(
        eq(payments.id, dto.transactionId),
        eq(payments.status, 'completed'),
      ),
    });

    if (!payment) {
      throw new NotFoundException('Payment not found or not eligible for refund');
    }

    const provider = this.getProvider(payment.provider);

    const refundResult = await provider.refund({
      paymentId: payment.providerPaymentId!,
      amount: dto.amount,
      reason: dto.reason,
    });

    return refundResult;
  }

  async getTransaction(userId: string, paymentId: string) {
    const payment = await (this.db.query as any).payments.findFirst({
      where: and(
        eq(payments.id, paymentId),
        eq(payments.userId, userId),
      ),
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async listTransactions(userId: string, dto: ListTransactionsDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const offset = (page - 1) * limit;

    const items = await (this.db.query as any).payments.findMany({
      where: eq(payments.userId, userId),
      orderBy: [desc(payments.createdAt)],
      limit,
      offset,
    });

    return {
      items,
      pagination: { page, limit },
    };
  }
}
