import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import {
  Database,
  invoices,
  payments,
  employers,
  companies,
  subscriptionPlans,
  users,
  platformSettings,
  emailSettings,
} from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { InvoicePdfService } from './invoice-pdf.service';
import { ListInvoicesDto } from './dto';

/** Keys stored in platform_settings table under category 'invoice' */
const INVOICE_SETTING_KEYS = {
  platformName: 'invoice_platform_name',
  platformAddress: 'invoice_platform_address',
  platformGstNumber: 'invoice_platform_gst_number',
  platformStateCode: 'invoice_platform_state_code',
  defaultHsnCode: 'invoice_default_hsn_code',
} as const;

interface PlatformInvoiceConfig {
  platformName: string;
  platformAddress: string;
  platformGstNumber: string;
  platformStateCode: string;
  defaultHsnCode: string;
}

interface BrandingConfig {
  logoUrl?: string | null;
  footerText?: string | null;
  supportEmail?: string | null;
  domainUrl?: string | null;
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  /** In-memory cache for platform settings (refreshed every 5 minutes) */
  private configCache: PlatformInvoiceConfig | null = null;
  private configCacheExpiry = 0;
  private brandingCache: BrandingConfig | null = null;
  private brandingCacheExpiry = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly configService: ConfigService,
    private readonly invoicePdfService: InvoicePdfService,
  ) {}

  // ─── Generate Invoice ──────────────────────────────────────────────

  /**
   * Generate an invoice for a payment.
   * @param paymentId - Payment UUID
   * @param requestUserId - If provided, validates the payment belongs to this user (user-facing endpoint).
   *                        If undefined, skips ownership check (webhook/internal call).
   */
  async generateInvoice(paymentId: string, requestUserId?: string) {
    // 1. Idempotency check — skip if invoice already exists for this payment
    const [existingInvoice] = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.paymentId, paymentId))
      .limit(1);

    if (existingInvoice) {
      this.logger.log(
        `Invoice already exists for payment ${paymentId}: ${existingInvoice.invoiceNumber}`,
      );
      return {
        message: 'Invoice already exists',
        data: existingInvoice,
      };
    }

    // 2. Fetch payment record
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Ownership check for user-facing endpoint
    if (requestUserId && payment.userId !== requestUserId) {
      throw new ForbiddenException('You do not have access to this payment');
    }

    if (payment.status !== 'success') {
      throw new ConflictException('Invoice can only be generated for successful payments');
    }

    // 3. Parse metadata for plan details
    const metadata = this.parseMetadata(payment.metadata);

    // 4. Fetch user details
    const [user] = await this.db.select().from(users).where(eq(users.id, payment.userId)).limit(1);

    // 5. Fetch company details for billing (employer -> company)
    const billingDetails = await this.getBillingDetails(payment.userId);

    // 6. Fetch plan details for line items
    let plan: any = null;
    if (metadata?.planId) {
      const [planRow] = await this.db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, metadata.planId))
        .limit(1);
      plan = planRow || null;
    }

    // 7. Build line items
    const lineItems = this.buildLineItems(payment, plan, metadata);

    // 8. Load platform config (DB first, env fallback)
    const platformConfig = await this.getPlatformConfig();

    // 9. Calculate tax (GST split)
    const taxBreakdown = this.calculateGstSplit(
      Number(payment.taxAmount) || 0,
      billingDetails?.stateCode,
      platformConfig.platformStateCode,
    );

    // 10. Calculate amounts
    const amount = Number(payment.amount) || 0;
    const taxAmount = Number(payment.taxAmount) || 0;
    const discountAmount = Number(payment.discountAmount) || 0;
    const totalAmount = amount + taxAmount - discountAmount;

    // 11. Generate sequential invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // 12. Insert invoice record
    const [invoice] = await this.db
      .insert(invoices)
      .values({
        paymentId: payment.id,
        userId: payment.userId,
        invoiceNumber,
        amount: String(amount),
        taxAmount: String(taxAmount),
        totalAmount: String(totalAmount),
        currency: payment.currency,
        billingName: billingDetails?.billingName || user?.firstName || null,
        billingAddress: billingDetails?.billingAddress || null,
        gstNumber: billingDetails?.gstNumber || null,
        hsnCode: platformConfig.defaultHsnCode,
        cgstAmount: String(taxBreakdown.cgstAmount),
        sgstAmount: String(taxBreakdown.sgstAmount),
        igstAmount: String(taxBreakdown.igstAmount),
        lineItems,
        notes: metadata?.type ? `Payment for ${metadata.type}` : null,
      } as any)
      .returning();

    // 13. Fetch branding config for PDF (logo, footer, etc.)
    const branding = await this.getBrandingConfig();

    // 14. Generate PDF and upload to S3
    let invoiceUrl: string | null = null;
    try {
      invoiceUrl = await this.invoicePdfService.generateAndUpload(
        invoice,
        platformConfig,
        branding,
      );

      // Update invoice record with PDF URL
      await this.db
        .update(invoices)
        .set({ invoiceUrl } as any)
        .where(eq(invoices.id, invoice.id));

      this.logger.log(`Invoice PDF generated: ${invoiceUrl}`);
    } catch (err: any) {
      // PDF failure should NOT block invoice creation — HTML download still works
      this.logger.error(
        `PDF generation failed for ${invoiceNumber}, HTML fallback available: ${err.message}`,
      );
    }

    // 15. Update payment record with invoice number and URL
    await this.db
      .update(payments)
      .set({
        invoiceNumber,
        invoiceUrl,
        updatedAt: new Date(),
      } as any)
      .where(eq(payments.id, payment.id));

    this.logger.log(`Invoice generated: ${invoiceNumber} for payment ${paymentId}`);

    return {
      message: 'Invoice generated successfully',
      data: { ...invoice, invoiceUrl },
    };
  }

  // ─── Get Invoice ───────────────────────────────────────────────────

  async getInvoice(userId: string, invoiceId: string) {
    const [invoice] = await this.db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
      .limit(1);

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Resolve S3 key to a presigned download URL
    let downloadUrl: string | null = null;
    if (invoice.invoiceUrl) {
      downloadUrl = await this.invoicePdfService.getDownloadUrl(invoice.invoiceUrl);
    }

    return {
      message: 'Invoice fetched successfully',
      data: { ...invoice, downloadUrl },
    };
  }

  // ─── List Invoices ─────────────────────────────────────────────────

  async listInvoices(userId: string, dto: ListInvoicesDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [eq(invoices.userId, userId)];

    if (dto.fromDate) {
      conditions.push(gte(invoices.generatedAt, new Date(dto.fromDate)));
    }
    if (dto.toDate) {
      conditions.push(lte(invoices.generatedAt, new Date(dto.toDate)));
    }

    const where = and(...conditions);

    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(invoices)
        .where(where)
        .orderBy(desc(invoices.generatedAt))
        .limit(limit)
        .offset(offset),
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

  // ─── Download Invoice ──────────────────────────────────────────────

  async downloadInvoice(userId: string, invoiceId: string) {
    const result = await this.getInvoice(userId, invoiceId);
    const invoice = result.data;

    // If S3 key exists, generate a presigned download URL (valid for 1 hour)
    if (invoice.invoiceUrl) {
      const downloadUrl = await this.invoicePdfService.getDownloadUrl(invoice.invoiceUrl);
      if (downloadUrl) {
        return {
          message: 'Invoice download URL generated',
          data: {
            invoiceNumber: invoice.invoiceNumber,
            format: 'pdf',
            downloadUrl,
            expiresIn: 3600,
          },
        };
      }
    }

    // Fallback: generate HTML on the fly
    const html = await this.generateInvoiceHtml(invoice);
    return {
      message: 'Invoice HTML generated',
      data: {
        invoiceNumber: invoice.invoiceNumber,
        format: 'html',
        downloadUrl: null,
        html,
      },
    };
  }

  // ─── Private: Generate Sequential Invoice Number ───────────────────

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();

    try {
      const result = await this.db.execute(sql`SELECT nextval('invoice_number_seq') as seq_num`);
      const rows = result as any;
      const seqNum = Number(rows[0]?.seq_num || rows?.rows?.[0]?.seq_num);
      return `INV-${year}-${String(seqNum).padStart(5, '0')}`;
    } catch (error: any) {
      // Fallback if sequence doesn't exist
      this.logger.warn(`Invoice sequence not found, using timestamp fallback: ${error.message}`);
      const timestamp = Date.now();
      return `INV-${year}-${timestamp}`;
    }
  }

  // ─── Private: Get Billing Details from Company ─────────────────────

  private async getBillingDetails(userId: string) {
    try {
      // Find employer linked to this user
      const [employer] = await this.db
        .select()
        .from(employers)
        .where(eq(employers.userId, userId))
        .limit(1);

      if (!employer?.companyId) return null;

      // Fetch company details
      const [company] = await this.db
        .select()
        .from(companies)
        .where(eq(companies.id, employer.companyId))
        .limit(1);

      if (!company) return null;

      // Build structured billing address
      const addressParts = [
        company.address,
        company.city,
        company.state,
        company.pincode,
        company.country,
      ].filter(Boolean);

      return {
        billingName: company.name,
        billingAddress:
          addressParts.length > 0 ? addressParts.join(', ') : company.headquarters || null,
        gstNumber: company.gstNumber || null,
        stateCode: company.stateCode || null,
        billingEmail: company.billingEmail || null,
      };
    } catch (error: any) {
      this.logger.warn(`Failed to fetch billing details for user ${userId}: ${error.message}`);
      return null;
    }
  }

  // ─── Private: Build Line Items ─────────────────────────────────────

  private formatBillingCycle(cycle: string): string {
    const map: Record<string, string> = {
      one_time: 'One Time',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      half_yearly: 'Half Yearly',
      yearly: 'Yearly',
      annual: 'Annual',
    };
    return (
      map[cycle?.toLowerCase()] ||
      cycle?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ||
      'Monthly'
    );
  }

  private buildLineItems(payment: any, plan: any, metadata: any): any[] {
    const items: any[] = [];

    if (plan) {
      const cycle = this.formatBillingCycle(plan.billingCycle || 'monthly');
      items.push({
        description: `${plan.name} Plan - ${cycle} Subscription`,
        quantity: 1,
        unitPrice: Number(plan.price) || Number(payment.amount) || 0,
        total: Number(payment.amount) || 0,
      });
    } else {
      // Generic line item from payment data
      const description = metadata?.type
        ? `${metadata.type.charAt(0).toUpperCase() + metadata.type.slice(1)} - Payment`
        : 'Service Payment';

      items.push({
        description,
        quantity: 1,
        unitPrice: Number(payment.amount) || 0,
        total: Number(payment.amount) || 0,
      });
    }

    return items;
  }

  // ─── Private: Calculate GST Split ─────────────────────────────────

  private calculateGstSplit(
    taxAmount: number,
    buyerStateCode?: string | null,
    platformStateCode?: string,
  ) {
    if (taxAmount <= 0) {
      return { cgstAmount: 0, sgstAmount: 0, igstAmount: 0 };
    }

    // If buyer state matches platform state -> intra-state (CGST + SGST)
    // Otherwise -> inter-state (IGST)
    if (platformStateCode && buyerStateCode && platformStateCode === buyerStateCode) {
      const cgst = Math.floor((taxAmount / 2) * 100) / 100;
      const sgst = Math.round((taxAmount - cgst) * 100) / 100;
      return {
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: 0,
      };
    }

    // Inter-state or state unknown -> full IGST (safe default)
    return {
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: taxAmount,
    };
  }

  // ─── Private: Parse Metadata ───────────────────────────────────────

  private parseMetadata(metadata: any): Record<string, any> | null {
    if (!metadata) return null;
    if (typeof metadata === 'object') return metadata;
    try {
      return JSON.parse(metadata);
    } catch {
      this.logger.warn('Failed to parse payment metadata');
      return null;
    }
  }

  // ─── Private: Platform Config (DB -> env fallback) ─────────────────

  /**
   * Reads invoice-related platform settings from the `platform_settings` table.
   * Falls back to environment variables if DB values are missing.
   * Results are cached in-memory for 5 minutes to avoid repeated DB queries.
   */
  async getPlatformConfig(): Promise<PlatformInvoiceConfig> {
    // Return cached config if still fresh
    if (this.configCache && Date.now() < this.configCacheExpiry) {
      return this.configCache;
    }

    const defaults: PlatformInvoiceConfig = {
      platformName: this.configService.get('PLATFORM_NAME') || 'AI Job Portal',
      platformAddress: this.configService.get('PLATFORM_ADDRESS') || '',
      platformGstNumber: this.configService.get('PLATFORM_GST_NUMBER') || '',
      platformStateCode: this.configService.get('PLATFORM_STATE_CODE') || '',
      defaultHsnCode: this.configService.get('DEFAULT_HSN_CODE') || '998314',
    };

    try {
      // Fetch all invoice-category settings in one query
      const settingKeys = Object.values(INVOICE_SETTING_KEYS);
      const rows = await this.db
        .select({ key: platformSettings.key, value: platformSettings.value })
        .from(platformSettings)
        .where(
          sql`${platformSettings.key} IN (${sql.join(
            settingKeys.map((k) => sql`${k}`),
            sql`, `,
          )})`,
        );

      // Build a lookup map
      const dbValues: Record<string, string> = {};
      for (const row of rows) {
        dbValues[row.key] = row.value;
      }

      // DB value takes priority, env var is fallback
      this.configCache = {
        platformName: dbValues[INVOICE_SETTING_KEYS.platformName] || defaults.platformName,
        platformAddress: dbValues[INVOICE_SETTING_KEYS.platformAddress] || defaults.platformAddress,
        platformGstNumber:
          dbValues[INVOICE_SETTING_KEYS.platformGstNumber] || defaults.platformGstNumber,
        platformStateCode:
          dbValues[INVOICE_SETTING_KEYS.platformStateCode] || defaults.platformStateCode,
        defaultHsnCode: dbValues[INVOICE_SETTING_KEYS.defaultHsnCode] || defaults.defaultHsnCode,
      };
      this.configCacheExpiry = Date.now() + this.CACHE_TTL_MS;

      this.logger.debug(`Platform invoice config loaded (${rows.length} DB values, rest from env)`);
      return this.configCache;
    } catch (error: any) {
      // If platform_settings table doesn't exist or query fails, use env vars
      this.logger.warn(`Failed to read platform_settings, using env fallback: ${error.message}`);
      this.configCache = defaults;
      this.configCacheExpiry = Date.now() + this.CACHE_TTL_MS;
      return defaults;
    }
  }

  // ─── Private: Branding Config (email_settings) ────────────────────

  /**
   * Reads branding settings from the `email_settings` table.
   * These are used for logo, footer text, and contact info on invoices and emails.
   * Cached in-memory for 5 minutes.
   */
  private async getBrandingConfig(): Promise<BrandingConfig> {
    if (this.brandingCache && Date.now() < this.brandingCacheExpiry) {
      return this.brandingCache;
    }

    try {
      const [settings] = await this.db
        .select({
          logoUrl: emailSettings.logoUrl,
          footerText: emailSettings.footerText,
          supportEmail: emailSettings.supportEmail,
          domainUrl: emailSettings.domainUrl,
        })
        .from(emailSettings)
        .limit(1);

      this.brandingCache = settings || {};
      this.brandingCacheExpiry = Date.now() + this.CACHE_TTL_MS;
      return this.brandingCache;
    } catch (error: any) {
      this.logger.warn(`Failed to read email_settings for branding: ${error.message}`);
      this.brandingCache = {};
      this.brandingCacheExpiry = Date.now() + this.CACHE_TTL_MS;
      return {};
    }
  }

  // ─── Private: Generate Invoice HTML ────────────────────────────────

  async generateInvoiceHtml(invoice: any, config?: PlatformInvoiceConfig): Promise<string> {
    const platformConfig = config || (await this.getPlatformConfig());
    const platformName = platformConfig.platformName;
    const platformGst = platformConfig.platformGstNumber;
    const platformAddress = platformConfig.platformAddress;

    const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];

    const lineItemsHtml = lineItems
      .map(
        (item: any) => `
        <tr>
          <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb;">${item.description || ''}</td>
          <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; text-align:center;">${item.quantity || 1}</td>
          <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; text-align:right;">${invoice.currency} ${Number(item.unitPrice || 0).toFixed(2)}</td>
          <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; text-align:right;">${invoice.currency} ${Number(item.total || 0).toFixed(2)}</td>
        </tr>`,
      )
      .join('');

    const taxRows: string[] = [];
    const cgst = Number(invoice.cgstAmount) || 0;
    const sgst = Number(invoice.sgstAmount) || 0;
    const igst = Number(invoice.igstAmount) || 0;

    if (cgst > 0) {
      taxRows.push(`
        <tr>
          <td colspan="3" style="padding:8px 12px; text-align:right;">CGST</td>
          <td style="padding:8px 12px; text-align:right;">${invoice.currency} ${cgst.toFixed(2)}</td>
        </tr>`);
    }
    if (sgst > 0) {
      taxRows.push(`
        <tr>
          <td colspan="3" style="padding:8px 12px; text-align:right;">SGST</td>
          <td style="padding:8px 12px; text-align:right;">${invoice.currency} ${sgst.toFixed(2)}</td>
        </tr>`);
    }
    if (igst > 0) {
      taxRows.push(`
        <tr>
          <td colspan="3" style="padding:8px 12px; text-align:right;">IGST</td>
          <td style="padding:8px 12px; text-align:right;">${invoice.currency} ${igst.toFixed(2)}</td>
        </tr>`);
    }

    const generatedDate = invoice.generatedAt
      ? new Date(invoice.generatedAt).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : new Date().toLocaleDateString('en-IN');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 40px; color: #1f2937; }
    .invoice-box { max-width: 800px; margin: auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
    .header h1 { margin: 0; font-size: 24px; color: #2563eb; }
    .header .invoice-title { text-align: right; }
    .header .invoice-title h2 { margin: 0 0 4px 0; font-size: 18px; color: #374151; }
    .header .invoice-title p { margin: 2px 0; font-size: 13px; color: #6b7280; }
    .billing { display: flex; justify-content: space-between; margin-bottom: 32px; }
    .billing-section h3 { margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; color: #6b7280; letter-spacing: 1px; }
    .billing-section p { margin: 2px 0; font-size: 14px; color: #374151; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead th { padding: 10px 12px; background: #f3f4f6; font-size: 12px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px; text-align: left; }
    thead th:nth-child(2) { text-align: center; }
    thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
    .total-row td { padding: 12px; font-weight: bold; font-size: 16px; border-top: 2px solid #1f2937; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
    .gst-info { font-size: 12px; color: #6b7280; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="invoice-box">
    <div class="header">
      <div>
        <h1>${platformName}</h1>
        <p style="margin:4px 0 0; font-size:13px; color:#6b7280;">Tax Invoice</p>
        ${platformAddress ? `<p style="margin:2px 0; font-size:12px; color:#6b7280;">${platformAddress}</p>` : ''}
        ${platformGst ? `<p class="gst-info">GSTIN: ${platformGst}</p>` : ''}
      </div>
      <div class="invoice-title">
        <h2>#${invoice.invoiceNumber}</h2>
        <p>Date: ${generatedDate}</p>
        ${invoice.hsnCode ? `<p>HSN/SAC: ${invoice.hsnCode}</p>` : ''}
      </div>
    </div>

    <div class="billing">
      <div class="billing-section">
        <h3>Bill To</h3>
        <p><strong>${invoice.billingName || 'N/A'}</strong></p>
        ${invoice.billingAddress ? `<p>${invoice.billingAddress}</p>` : ''}
        ${invoice.gstNumber ? `<p class="gst-info">GSTIN: ${invoice.gstNumber}</p>` : ''}
      </div>
      <div class="billing-section" style="text-align:right;">
        <h3>Payment Info</h3>
        <p>Payment ID: ${invoice.paymentId || 'N/A'}</p>
        <p>Currency: ${invoice.currency}</p>
      </div>
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
          lineItemsHtml ||
          `
        <tr>
          <td colspan="4" style="padding:20px 12px; text-align:center; color:#9ca3af;">No line items</td>
        </tr>`
        }
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:8px 12px; text-align:right; color:#6b7280;">Subtotal</td>
          <td style="padding:8px 12px; text-align:right;">${invoice.currency} ${Number(invoice.amount).toFixed(2)}</td>
        </tr>
        ${taxRows.join('')}
        <tr class="total-row">
          <td colspan="3" style="text-align:right;">Total</td>
          <td style="text-align:right;">${invoice.currency} ${Number(invoice.totalAmount).toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>

    ${invoice.notes ? `<p style="font-size:13px; color:#6b7280;"><strong>Notes:</strong> ${invoice.notes}</p>` : ''}

    <div class="footer">
      <p>Thank you for your business!</p>
      <p>This is a computer-generated invoice and does not require a signature.</p>
    </div>
  </div>
</body>
</html>`;
  }
}
