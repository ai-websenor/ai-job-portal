import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { Database, invoices, payments } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { ListInvoicesDto } from './dto';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async generateInvoice(paymentId: string) {
    const payment = await (this.db.query as any).payments.findFirst({
      where: eq(payments.id, paymentId),
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const [invoice] = await this.db
      .insert(invoices)
      .values({
        paymentId: payment.id,
        invoiceNumber,
        amount: payment.amount,
        totalAmount: payment.amount,
        currency: payment.currency,
      } as any)
      .returning();

    return {
      message: 'Invoice generated successfully',
      data: invoice,
    };
  }

  async getInvoice(userId: string, invoiceId: string) {
    const invoice = await (this.db.query as any).invoices.findFirst({
      where: eq(invoices.id, invoiceId),
      with: {
        payment: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return {
      message: 'Invoice fetched successfully',
      data: invoice,
    };
  }

  async listInvoices(userId: string, dto: ListInvoicesDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (dto.fromDate) {
      conditions.push(gte(invoices.generatedAt, new Date(dto.fromDate)));
    }
    if (dto.toDate) {
      conditions.push(lte(invoices.generatedAt, new Date(dto.toDate)));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countResult] = await Promise.all([
      (this.db.query as any).invoices.findMany({
        where,
        orderBy: [desc(invoices.generatedAt)],
        limit,
        offset,
      }),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(where),
    ]);

    const total = Number(countResult[0]?.count || 0);
    const pageCount = Math.ceil(total / limit);

    return {
      message: 'Invoices fetched successfully',
      data: items,
      pagination: {
        totalInvoice: total,
        pageCount,
        currentPage: page,
        hasNextPage: page < pageCount,
      },
    };
  }

  async downloadInvoice(userId: string, invoiceId: string) {
    const result = await this.getInvoice(userId, invoiceId);
    const invoice = result.data;

    const html = this.generateInvoiceHtml(invoice);

    return {
      invoiceNumber: invoice.invoiceNumber,
      html,
    };
  }

  private generateInvoiceHtml(invoice: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .invoice-details { margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          .total { font-weight: bold; font-size: 1.2em; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>AI Job Portal</h1>
            <p>Tax Invoice</p>
          </div>
          <div>
            <h2>Invoice #${invoice.invoiceNumber}</h2>
            <p>Date: ${new Date(invoice.issuedAt).toLocaleDateString()}</p>
            <p>Status: ${invoice.status.toUpperCase()}</p>
          </div>
        </div>

        <div class="invoice-details">
          <h3>Bill To:</h3>
          <p>${invoice.billingDetails?.name || 'N/A'}</p>
          <p>${invoice.billingDetails?.email || 'N/A'}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${
              invoice.lineItems
                ?.map(
                  (item: any) => `
              <tr>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>${invoice.currency} ${(item.unitPrice / 100).toFixed(2)}</td>
                <td>${invoice.currency} ${(item.total / 100).toFixed(2)}</td>
              </tr>
            `,
                )
                .join('') || ''
            }
          </tbody>
          <tfoot>
            <tr class="total">
              <td colspan="3">Total</td>
              <td>${invoice.currency} ${(invoice.amount / 100).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <p style="margin-top: 40px; color: #666;">
          Thank you for your business!
        </p>
      </body>
      </html>
    `;
  }
}
