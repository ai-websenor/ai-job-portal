import { Injectable, Logger } from '@nestjs/common';
import { S3Service } from '@ai-job-portal/aws';
import PDFDocument = require('pdfkit');

interface InvoiceData {
  invoiceNumber: string;
  generatedAt?: Date | string | null;
  currency?: string | null;
  billingName?: string | null;
  billingAddress?: string | null;
  gstNumber?: string | null;
  hsnCode?: string | null;
  paymentId?: string | null;
  amount?: string | number | null;
  taxAmount?: string | number | null;
  totalAmount?: string | number | null;
  cgstAmount?: string | number | null;
  sgstAmount?: string | number | null;
  igstAmount?: string | number | null;
  lineItems?: any[] | unknown;
  notes?: string | null;
}

interface PlatformConfig {
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
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  constructor(private readonly s3Service: S3Service) {}

  /**
   * Generates a PDF buffer from invoice data using PDFKit.
   */
  async generatePdfBuffer(
    invoice: InvoiceData,
    platformConfig: PlatformConfig,
    branding?: BrandingConfig,
  ): Promise<Buffer> {
    // Pre-fetch logo image if URL is set
    let logoBuffer: Buffer | null = null;
    if (branding?.logoUrl) {
      logoBuffer = await this.fetchImage(branding.logoUrl);
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        this.renderInvoice(doc, invoice, platformConfig, branding || {}, logoBuffer);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generates a PDF from invoice data and uploads it to S3.
   * Returns the S3 key (not public URL — invoices are private).
   */
  async generateAndUpload(
    invoice: InvoiceData,
    platformConfig: PlatformConfig,
    branding?: BrandingConfig,
  ): Promise<string> {
    const pdfBuffer = await this.generatePdfBuffer(invoice, platformConfig, branding);

    const year = new Date().getFullYear();
    const s3Key = `invoices/${year}/${invoice.invoiceNumber}.pdf`;

    await this.s3Service.upload(s3Key, pdfBuffer, 'application/pdf');

    this.logger.log(`Invoice PDF uploaded: ${s3Key} (${pdfBuffer.length} bytes)`);

    return s3Key;
  }

  /**
   * Generates a presigned download URL for an invoice PDF.
   * URL expires in 1 hour by default.
   */
  async getDownloadUrl(s3KeyOrUrl: string, expiresIn = 3600): Promise<string | null> {
    return this.s3Service.getSignedDownloadUrlFromKeyOrUrl(s3KeyOrUrl, expiresIn);
  }

  // ─── Private: Fetch image from URL ────────────────────────────────

  private async fetchImage(url: string): Promise<Buffer | null> {
    try {
      // Handle S3 keys (not full URLs)
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        const signedUrl = await this.s3Service.getSignedDownloadUrlFromKeyOrUrl(url, 300);
        if (!signedUrl) return null;
        url = signedUrl;
      }

      const response = await fetch(url);
      if (!response.ok) return null;

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err: any) {
      this.logger.warn(`Failed to fetch logo image: ${err.message}`);
      return null;
    }
  }

  // ─── Private: Render PDF ─────────────────────────────────────────

  private renderInvoice(
    doc: PDFKit.PDFDocument,
    invoice: InvoiceData,
    config: PlatformConfig,
    branding: BrandingConfig,
    logoBuffer: Buffer | null,
  ) {
    const blue = '#2563eb';
    const darkGray = '#1f2937';
    const midGray = '#6b7280';
    const lightGray = '#e5e7eb';
    const pageWidth = doc.page.width - 100; // 50 margin each side

    // ── Header ──
    let headerY = 50;

    doc.fontSize(20).fillColor(blue).text(config.platformName, 50, headerY);
    doc
      .fontSize(10)
      .fillColor(midGray)
      .text('Tax Invoice', 50, headerY + 25);

    let leftInfoY = headerY + 38;
    if (config.platformAddress) {
      doc.text(config.platformAddress, 50, leftInfoY, { width: 250 });
      leftInfoY += doc.heightOfString(config.platformAddress, { width: 250 }) + 2;
    }
    if (config.platformGstNumber) {
      doc.text(`GSTIN: ${config.platformGstNumber}`, 50, leftInfoY);
      leftInfoY += 13;
    }

    // Invoice number & date & time (right side)
    doc
      .fontSize(14)
      .fillColor(darkGray)
      .text(`#${invoice.invoiceNumber}`, 350, headerY, { align: 'right' });

    const generatedDate = invoice.generatedAt ? new Date(invoice.generatedAt) : new Date();
    const dateStr = generatedDate.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = generatedDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    doc
      .fontSize(10)
      .fillColor(midGray)
      .text(`Date: ${dateStr}`, 350, headerY + 20, { align: 'right' });
    doc.text(`Time: ${timeStr}`, 350, headerY + 33, { align: 'right' });

    if (invoice.hsnCode) {
      doc.text(`HSN/SAC: ${invoice.hsnCode}`, 350, headerY + 46, { align: 'right' });
    }

    // Separator line
    const separatorY = Math.max(leftInfoY, headerY + 60) + 5;
    doc
      .moveTo(50, separatorY)
      .lineTo(50 + pageWidth, separatorY)
      .strokeColor(blue)
      .lineWidth(2)
      .stroke();

    // ── Billing Section ──
    let y = separatorY + 15;
    const billingStartY = y;

    doc.fontSize(9).fillColor(midGray).text('BILL TO', 50, y);
    y += 14;
    doc
      .fontSize(11)
      .fillColor(darkGray)
      .text(invoice.billingName || 'N/A', 50, y);
    y += 16;
    if (invoice.billingAddress) {
      doc.fontSize(9).fillColor(midGray).text(invoice.billingAddress, 50, y, { width: 250 });
      y += doc.heightOfString(invoice.billingAddress, { width: 250 }) + 4;
    }
    if (invoice.gstNumber) {
      doc.fontSize(9).fillColor(midGray).text(`GSTIN: ${invoice.gstNumber}`, 50, y);
      y += 14;
    }

    // Payment info (right side)
    const rightColX = 320;
    const rightColW = pageWidth - rightColX + 50;
    let rightY = billingStartY;

    doc.fontSize(9).fillColor(midGray).text('PAYMENT INFO', rightColX, rightY, {
      width: rightColW,
      align: 'right',
    });
    rightY += 14;

    const paymentIdStr = invoice.paymentId || 'N/A';
    doc.fontSize(9).fillColor(darkGray).text(`Payment ID: ${paymentIdStr}`, rightColX, rightY, {
      width: rightColW,
      align: 'right',
    });
    rightY += doc.heightOfString(`Payment ID: ${paymentIdStr}`, { width: rightColW }) + 4;

    doc.text(`Currency: ${invoice.currency || 'INR'}`, rightColX, rightY, {
      width: rightColW,
      align: 'right',
    });

    // ── Line Items Table ──
    y = Math.max(y, billingStartY + 50) + 10;

    const colX = { desc: 50, qty: 330, unit: 390, total: 470 };
    const colW = { desc: 270, qty: 50, unit: 70, total: 75 };

    // Table header
    doc.rect(50, y, pageWidth, 22).fill('#f3f4f6');
    doc.fontSize(8).fillColor(midGray);
    doc.text('DESCRIPTION', colX.desc + 8, y + 7, { width: colW.desc });
    doc.text('QTY', colX.qty, y + 7, { width: colW.qty, align: 'center' });
    doc.text('UNIT PRICE', colX.unit, y + 7, { width: colW.unit, align: 'right' });
    doc.text('TOTAL', colX.total, y + 7, { width: colW.total, align: 'right' });
    y += 22;

    // Table rows
    const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
    const currency = invoice.currency || 'INR';

    if (lineItems.length === 0) {
      doc
        .fontSize(9)
        .fillColor(midGray)
        .text('No line items', 50, y + 8, { width: pageWidth, align: 'center' });
      y += 30;
    } else {
      for (const item of lineItems) {
        doc.fontSize(9).fillColor(darkGray);
        doc.text(item.description || '', colX.desc + 8, y + 6, { width: colW.desc });
        doc.text(String(item.quantity || 1), colX.qty, y + 6, {
          width: colW.qty,
          align: 'center',
        });
        doc.text(`${currency} ${Number(item.unitPrice || 0).toFixed(2)}`, colX.unit, y + 6, {
          width: colW.unit,
          align: 'right',
        });
        doc.text(`${currency} ${Number(item.total || 0).toFixed(2)}`, colX.total, y + 6, {
          width: colW.total,
          align: 'right',
        });
        y += 24;
        doc
          .moveTo(50, y)
          .lineTo(50 + pageWidth, y)
          .strokeColor(lightGray)
          .lineWidth(0.5)
          .stroke();
      }
    }

    // ── Totals ──
    y += 8;
    const labelX = colX.unit - 60;
    const valX = colX.total;

    // Subtotal
    doc.fontSize(9).fillColor(midGray).text('Subtotal', labelX, y, { width: 130, align: 'right' });
    doc.fillColor(darkGray).text(`${currency} ${Number(invoice.amount || 0).toFixed(2)}`, valX, y, {
      width: colW.total,
      align: 'right',
    });
    y += 16;

    // Tax rows
    const cgst = Number(invoice.cgstAmount) || 0;
    const sgst = Number(invoice.sgstAmount) || 0;
    const igst = Number(invoice.igstAmount) || 0;

    if (cgst > 0) {
      doc.fillColor(midGray).text('CGST', labelX, y, { width: 130, align: 'right' });
      doc
        .fillColor(darkGray)
        .text(`${currency} ${cgst.toFixed(2)}`, valX, y, { width: colW.total, align: 'right' });
      y += 16;
    }
    if (sgst > 0) {
      doc.fillColor(midGray).text('SGST', labelX, y, { width: 130, align: 'right' });
      doc
        .fillColor(darkGray)
        .text(`${currency} ${sgst.toFixed(2)}`, valX, y, { width: colW.total, align: 'right' });
      y += 16;
    }
    if (igst > 0) {
      doc.fillColor(midGray).text('IGST', labelX, y, { width: 130, align: 'right' });
      doc
        .fillColor(darkGray)
        .text(`${currency} ${igst.toFixed(2)}`, valX, y, { width: colW.total, align: 'right' });
      y += 16;
    }

    // Total line
    doc
      .moveTo(labelX, y)
      .lineTo(50 + pageWidth, y)
      .strokeColor(darkGray)
      .lineWidth(1.5)
      .stroke();
    y += 6;
    doc.fontSize(12).fillColor(darkGray).text('Total', labelX, y, { width: 130, align: 'right' });
    doc.text(`${currency} ${Number(invoice.totalAmount || 0).toFixed(2)}`, valX, y, {
      width: colW.total,
      align: 'right',
    });
    y += 24;

    // ── Notes ──
    if (invoice.notes) {
      doc
        .fontSize(9)
        .fillColor(midGray)
        .text(`Notes: ${invoice.notes}`, 50, y, { width: pageWidth });
      y += 20;
    }

    // ── Footer ──
    y = Math.max(y + 30, 680);
    doc
      .moveTo(50, y)
      .lineTo(50 + pageWidth, y)
      .strokeColor(lightGray)
      .lineWidth(0.5)
      .stroke();
    y += 12;

    // Logo above thank-you text
    if (logoBuffer) {
      try {
        const logoWidth = 100;
        const logoX = (doc.page.width - logoWidth) / 2;
        doc.image(logoBuffer, logoX, y, { width: logoWidth, height: 30 });
        y += 38;
      } catch {
        // silently skip if logo embed fails
      }
    }

    doc
      .fontSize(9)
      .fillColor(midGray)
      .text('Thank you for your business!', 50, y, { width: pageWidth, align: 'center' });
    y += 14;
    doc.text('This is a computer-generated invoice and does not require a signature.', 50, y, {
      width: pageWidth,
      align: 'center',
    });
    y += 14;

    // Dynamic footer text from email settings
    if (branding.footerText) {
      doc.text(branding.footerText, 50, y, { width: pageWidth, align: 'center' });
      y += 14;
    }

    // Support / domain info
    const footerParts: string[] = [];
    if (branding.supportEmail) footerParts.push(branding.supportEmail);
    if (branding.domainUrl) footerParts.push(branding.domainUrl);
    if (footerParts.length > 0) {
      doc.fontSize(8).text(footerParts.join('  |  '), 50, y, {
        width: pageWidth,
        align: 'center',
      });
    }
  }
}
