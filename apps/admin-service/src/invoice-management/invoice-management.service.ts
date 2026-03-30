import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq, desc, sql, and, gte, lte, or, ilike, count, isNotNull, isNull } from 'drizzle-orm';
import { Database, invoices, payments, users, employers, companies } from '@ai-job-portal/database';
import { SqsService, S3Service } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import { ListInvoicesDto } from './dto';

@Injectable()
export class InvoiceManagementService {
  private readonly logger = new Logger(InvoiceManagementService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly sqsService: SqsService,
    private readonly s3Service: S3Service,
  ) {}

  async listInvoices(dto: ListInvoicesDto) {
    const page = Number(dto.page) || 1;
    const limit = Number(dto.limit) || 20;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: any[] = [];

    // Only show invoices for successful payments
    conditions.push(eq(payments.status, 'success'));

    if (dto.search) {
      const searchPattern = `%${dto.search}%`;
      conditions.push(
        or(
          ilike(invoices.invoiceNumber, searchPattern),
          ilike(invoices.billingName, searchPattern),
          ilike(users.email, searchPattern),
          ilike(users.firstName, searchPattern),
          ilike(users.lastName, searchPattern),
          ilike(payments.gatewayPaymentId, searchPattern),
          sql`${invoices.lineItems}::text ILIKE ${searchPattern}`,
        ),
      );
    }

    if (dto.userId) {
      conditions.push(eq(invoices.userId, dto.userId));
    }

    if (dto.emailStatus === 'sent') {
      conditions.push(isNotNull(invoices.emailSentAt));
    } else if (dto.emailStatus === 'not_sent') {
      conditions.push(isNull(invoices.emailSentAt));
    }

    if (dto.dateFrom) {
      conditions.push(gte(invoices.generatedAt, new Date(dto.dateFrom)));
    }

    if (dto.dateTo) {
      conditions.push(lte(invoices.generatedAt, new Date(dto.dateTo)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Company filter requires a subquery via employers table
    let companyCondition: any = undefined;
    if (dto.companyId) {
      companyCondition = sql`${invoices.userId} IN (
        SELECT ${employers.userId} FROM ${employers} WHERE ${employers.companyId} = ${dto.companyId}
      )`;
    }

    const finalWhere = companyCondition
      ? whereClause
        ? and(whereClause, companyCondition)
        : companyCondition
      : whereClause;

    // Count query
    const [countResult] = await this.db
      .select({ total: count() })
      .from(invoices)
      .leftJoin(users, eq(invoices.userId, users.id))
      .leftJoin(payments, eq(invoices.paymentId, payments.id))
      .where(finalWhere);

    const total = countResult?.total || 0;

    // Data query with joins
    const rows = await this.db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        paymentId: invoices.paymentId,
        userId: invoices.userId,
        amount: invoices.amount,
        taxAmount: invoices.taxAmount,
        totalAmount: invoices.totalAmount,
        currency: invoices.currency,
        billingName: invoices.billingName,
        billingAddress: invoices.billingAddress,
        gstNumber: invoices.gstNumber,
        hsnCode: invoices.hsnCode,
        cgstAmount: invoices.cgstAmount,
        sgstAmount: invoices.sgstAmount,
        igstAmount: invoices.igstAmount,
        invoiceUrl: invoices.invoiceUrl,
        lineItems: invoices.lineItems,
        notes: invoices.notes,
        generatedAt: invoices.generatedAt,
        emailSentAt: invoices.emailSentAt,
        // User fields
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        // Payment fields
        paymentStatus: payments.status,
        paymentGateway: payments.paymentGateway,
        gatewayPaymentId: payments.gatewayPaymentId,
      })
      .from(invoices)
      .leftJoin(users, eq(invoices.userId, users.id))
      .leftJoin(payments, eq(invoices.paymentId, payments.id))
      .where(finalWhere)
      .orderBy(desc(invoices.generatedAt))
      .limit(limit)
      .offset(offset);

    // Fetch company info for each unique userId
    const userIds = [...new Set(rows.map((r) => r.userId))];
    const companyMap: Record<string, { companyId: string; companyName: string }> = {};

    if (userIds.length > 0) {
      const employerRows = await this.db
        .select({
          userId: employers.userId,
          companyId: employers.companyId,
          companyName: companies.name,
        })
        .from(employers)
        .leftJoin(companies, eq(employers.companyId, companies.id))
        .where(
          sql`${employers.userId} IN (${sql.join(
            userIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        );

      for (const row of employerRows) {
        if (row.userId && row.companyId) {
          companyMap[row.userId] = {
            companyId: row.companyId,
            companyName: row.companyName || '',
          };
        }
      }
    }

    const data = rows.map((row) => ({
      ...row,
      companyId: companyMap[row.userId]?.companyId || null,
      companyName: companyMap[row.userId]?.companyName || null,
    }));

    return {
      message: 'Invoices fetched successfully',
      data,
      pagination: {
        totalInvoice: total,
        pageCount: Math.ceil(total / limit),
        currentPage: page,
        hasNextPage: page * limit < total,
      },
    };
  }

  async getInvoice(invoiceId: string) {
    const [invoice] = await this.db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        paymentId: invoices.paymentId,
        userId: invoices.userId,
        amount: invoices.amount,
        taxAmount: invoices.taxAmount,
        totalAmount: invoices.totalAmount,
        currency: invoices.currency,
        billingName: invoices.billingName,
        billingAddress: invoices.billingAddress,
        gstNumber: invoices.gstNumber,
        hsnCode: invoices.hsnCode,
        cgstAmount: invoices.cgstAmount,
        sgstAmount: invoices.sgstAmount,
        igstAmount: invoices.igstAmount,
        invoiceUrl: invoices.invoiceUrl,
        lineItems: invoices.lineItems,
        notes: invoices.notes,
        generatedAt: invoices.generatedAt,
        emailSentAt: invoices.emailSentAt,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        paymentStatus: payments.status,
        paymentGateway: payments.paymentGateway,
        gatewayPaymentId: payments.gatewayPaymentId,
      })
      .from(invoices)
      .leftJoin(users, eq(invoices.userId, users.id))
      .leftJoin(payments, eq(invoices.paymentId, payments.id))
      .where(eq(invoices.id, invoiceId));

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return { message: 'Invoice fetched successfully', data: invoice };
  }

  async resendInvoiceEmail(invoiceId: string) {
    const [invoice] = await this.db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        userId: invoices.userId,
        totalAmount: invoices.totalAmount,
        currency: invoices.currency,
        invoiceUrl: invoices.invoiceUrl,
      })
      .from(invoices)
      .where(eq(invoices.id, invoiceId));

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    await this.sqsService.sendInvoiceGeneratedNotification({
      userId: invoice.userId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: String(invoice.totalAmount),
      currency: invoice.currency || 'INR',
      downloadUrl: invoice.invoiceUrl || undefined,
    });

    this.logger.log(`Resent invoice email for ${invoice.invoiceNumber}`);

    return { message: `Invoice email resent for ${invoice.invoiceNumber}` };
  }

  async getDownloadUrl(invoiceId: string) {
    const [invoice] = await this.db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        invoiceUrl: invoices.invoiceUrl,
      })
      .from(invoices)
      .where(eq(invoices.id, invoiceId));

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (!invoice.invoiceUrl) {
      throw new NotFoundException('No PDF available for this invoice');
    }

    const downloadUrl = await this.s3Service.getSignedDownloadUrlFromKeyOrUrl(
      invoice.invoiceUrl,
      3600,
    );

    if (!downloadUrl) {
      throw new NotFoundException('Failed to generate download URL');
    }

    return {
      message: 'Download URL generated',
      data: { downloadUrl, invoiceNumber: invoice.invoiceNumber },
    };
  }
}
