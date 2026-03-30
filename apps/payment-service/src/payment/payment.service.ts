import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import { Database, payments } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { RazorpayProvider } from './providers/razorpay.provider';
import { StripeProvider } from './providers/stripe.provider';
import { SubscriptionService } from '../subscription/subscription.service';
import { InvoiceService } from '../invoice/invoice.service';
import { InvoicePdfService } from '../invoice/invoice-pdf.service';
import { SqsService } from '@ai-job-portal/aws';
import { CreateOrderDto, VerifyPaymentDto, RefundDto, ListTransactionsDto } from './dto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly razorpayProvider: RazorpayProvider,
    private readonly stripeProvider: StripeProvider,
    @Inject(forwardRef(() => SubscriptionService))
    private readonly subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => InvoiceService))
    private readonly invoiceService: InvoiceService,
    private readonly invoicePdfService: InvoicePdfService,
    private readonly sqsService: SqsService,
  ) {}

  private getProvider(name: 'razorpay' | 'stripe') {
    return name === 'razorpay' ? this.razorpayProvider : this.stripeProvider;
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    const provider = this.getProvider(dto.provider);

    // Generate a unique receipt/idempotency key
    const receipt = `order_${userId}_${Date.now()}`;

    const order = await provider.createOrder({
      amount: dto.amount,
      currency: dto.currency,
      receipt,
      notes: { userId, type: dto.type, ...(dto.planId ? { planId: dto.planId } : {}) },
    });

    const metadata: Record<string, any> = {
      userId,
      type: dto.type,
      ...(dto.planId ? { planId: dto.planId } : {}),
    };

    const [payment] = await this.db
      .insert(payments)
      .values({
        userId,
        amount: dto.amount,
        currency: dto.currency,
        status: 'pending',
        paymentGateway: dto.provider,
        gatewayOrderId: order.orderId,
        metadata: JSON.stringify(metadata),
      } as any)
      .returning();

    return {
      message: 'Payment order created successfully',
      data: {
        paymentId: payment.id,
        orderId: order.orderId,
        amount: dto.amount,
        currency: dto.currency,
        provider: dto.provider,
        ...(dto.provider === 'stripe' ? { clientSecret: order.providerData.clientSecret } : {}),
        ...(dto.provider === 'razorpay' ? order.providerData : {}),
      },
    };
  }

  async verifyPayment(userId: string, dto: VerifyPaymentDto) {
    const provider = this.getProvider(dto.provider);

    const payment = await (this.db.query as any).payments.findFirst({
      where: and(
        eq(payments.gatewayOrderId, dto.orderId),
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
      await this.db
        .update(payments)
        .set({ status: 'failed', updatedAt: new Date() } as any)
        .where(eq(payments.id, payment.id));

      throw new BadRequestException('Payment verification failed');
    }

    // Auto-detect payment method from gateway (fallback to dto value if provided)
    let resolvedPaymentMethod: string | null = dto.paymentMethod ?? null;
    if (!resolvedPaymentMethod && dto.provider === 'stripe') {
      try {
        const pi = await this.stripeProvider.getPaymentDetails(dto.orderId);
        const stripeMethod = (pi as any)?.payment_method_types?.[0] as string | undefined;
        const methodMap: Record<string, string> = {
          card: 'credit_card',
          upi: 'upi',
          netbanking: 'netbanking',
          wallet: 'wallet',
        };
        resolvedPaymentMethod = methodMap[stripeMethod ?? ''] ?? null;
      } catch (err: any) {
        this.logger.warn(`Could not auto-detect payment method from Stripe: ${err.message}`);
      }
    }

    const updatePayload: Record<string, any> = {
      status: 'success',
      gatewayPaymentId: dto.paymentId,
      transactionId: dto.transactionId ?? dto.paymentId,
      updatedAt: new Date(),
    };

    if (resolvedPaymentMethod) {
      updatePayload.paymentMethod = resolvedPaymentMethod;
    }

    const [updated] = await this.db
      .update(payments)
      .set(updatePayload as any)
      .where(eq(payments.id, payment.id))
      .returning();

    // Activate subscription if this payment is for a plan purchase
    let subscription = null;
    try {
      const metadata =
        typeof payment.metadata === 'string' ? JSON.parse(payment.metadata) : payment.metadata;
      const planId = metadata?.planId;

      if (planId) {
        const result = await this.subscriptionService.activateSubscription(
          userId,
          planId,
          payment.id,
        );
        subscription = result.data;
      }
    } catch (err: any) {
      this.logger.error(`Failed to activate subscription after payment: ${err.message}`);
    }

    // Generate invoice immediately on payment verification (don't rely solely on webhook)
    let invoice = null;
    try {
      const invoiceResult = await this.invoiceService.generateInvoice(payment.id);
      invoice = invoiceResult.data;

      // Send invoice email notification via SQS
      try {
        let downloadUrl: string | undefined;
        if (invoice.invoiceUrl) {
          downloadUrl =
            (await this.invoicePdfService.getDownloadUrl(invoice.invoiceUrl)) || undefined;
        }
        await this.sqsService.sendInvoiceGeneratedNotification({
          userId: payment.userId,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: String(invoice.totalAmount),
          currency: invoice.currency || 'INR',
          downloadUrl,
        });
        this.logger.log(`Invoice notification queued for payment: ${payment.id}`);
      } catch (notifErr: any) {
        this.logger.error(
          `Failed to queue invoice notification for payment ${payment.id}: ${notifErr.message}`,
        );
      }
    } catch (err: any) {
      this.logger.error(`Failed to generate invoice after payment verification: ${err.message}`);
    }

    // Re-fetch to get updated invoiceNumber and invoiceUrl written by generateInvoice
    const finalPayment = invoice
      ? await (this.db.query as any).payments.findFirst({ where: eq(payments.id, payment.id) })
      : updated;

    return {
      message: 'Payment verified successfully',
      data: { ...finalPayment, subscription },
    };
  }

  async refund(userId: string, dto: RefundDto) {
    const payment = await (this.db.query as any).payments.findFirst({
      where: and(eq(payments.id, dto.transactionId), eq(payments.status, 'success')),
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

    return {
      message: 'Refund processed successfully',
      data: refundResult,
    };
  }

  async getTransaction(userId: string, paymentId: string) {
    const payment = await (this.db.query as any).payments.findFirst({
      where: and(eq(payments.id, paymentId), eq(payments.userId, userId)),
    });

    if (!payment) {
      throw new NotFoundException('Transaction not found');
    }

    return {
      message: 'Transaction fetched successfully',
      data: payment,
    };
  }

  async listTransactions(userId: string, dto: ListTransactionsDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [eq(payments.userId, userId)];

    if (dto.status) {
      conditions.push(
        eq(payments.status, dto.status as 'pending' | 'success' | 'failed' | 'refunded'),
      );
    }
    if (dto.provider) {
      conditions.push(eq(payments.paymentGateway, dto.provider));
    }

    const where = and(...conditions);

    const [items, countResult] = await Promise.all([
      (this.db.query as any).payments.findMany({
        where,
        orderBy: [desc(payments.createdAt)],
        limit,
        offset,
      }),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(payments)
        .where(where),
    ]);

    const total = Number(countResult[0]?.count || 0);
    const pageCount = Math.ceil(total / limit);

    return {
      message: 'Transactions fetched successfully',
      data: items,
      pagination: {
        totalTransaction: total,
        pageCount,
        currentPage: page,
        hasNextPage: page < pageCount,
      },
    };
  }
}
