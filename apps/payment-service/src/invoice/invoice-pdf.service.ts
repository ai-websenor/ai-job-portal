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

@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  constructor(private readonly s3Service: S3Service) {}

  /**
   * Generates a PDF buffer from invoice data using PDFKit.
   */
  async generatePdfBuffer(invoice: InvoiceData, platformConfig: PlatformConfig): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        this.renderInvoice(doc, invoice, platformConfig);

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
  async generateAndUpload(invoice: InvoiceData, platformConfig: PlatformConfig): Promise<string> {
    const pdfBuffer = await this.generatePdfBuffer(invoice, platformConfig);

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

  // ─── Private: Render PDF ─────────────────────────────────────────

  private renderInvoice(doc: PDFKit.PDFDocument, invoice: InvoiceData, config: PlatformConfig) {
    const blue = '#2563eb';
    const darkGray = '#1f2937';
    const midGray = '#6b7280';
    const lightGray = '#e5e7eb';
    const pageWidth = doc.page.width - 100; // 50 margin each side

    // ── Header ──
    doc.fontSize(20).fillColor(blue).text(config.platformName, 50, 50);
    doc.fontSize(10).fillColor(midGray).text('Tax Invoice', 50, 75);
    if (config.platformAddress) {
      doc.text(config.platformAddress, 50, 88, { width: 250 });
    }
    if (config.platformGstNumber) {
      doc.text(`GSTIN: ${config.platformGstNumber}`, 50, config.platformAddress ? 101 : 88);
    }

    // Invoice number & date (right side)
    doc
      .fontSize(14)
      .fillColor(darkGray)
      .text(`#${invoice.invoiceNumber}`, 350, 50, { align: 'right' });
    const generatedDate = invoice.generatedAt
      ? new Date(invoice.generatedAt).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : new Date().toLocaleDateString('en-IN');
    doc.fontSize(10).fillColor(midGray).text(`Date: ${generatedDate}`, 350, 70, { align: 'right' });
    if (invoice.hsnCode) {
      doc.text(`HSN/SAC: ${invoice.hsnCode}`, 350, 83, { align: 'right' });
    }

    // Separator line
    doc
      .moveTo(50, 115)
      .lineTo(50 + pageWidth, 115)
      .strokeColor(blue)
      .lineWidth(2)
      .stroke();

    // ── Billing Section ──
    let y = 130;
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
    doc.fontSize(9).fillColor(midGray).text('PAYMENT INFO', 350, 130, { align: 'right' });
    doc
      .fontSize(9)
      .fillColor(darkGray)
      .text(`Payment ID: ${invoice.paymentId || 'N/A'}`, 350, 144, { align: 'right' });
    doc.text(`Currency: ${invoice.currency || 'INR'}`, 350, 157, { align: 'right' });

    // ── Line Items Table ──
    y = Math.max(y, 180) + 10;

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
        doc.text(String(item.quantity || 1), colX.qty, y + 6, { width: colW.qty, align: 'center' });
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
    y += 10;
    doc
      .fontSize(9)
      .fillColor(midGray)
      .text('Thank you for your business!', 50, y, { width: pageWidth, align: 'center' });
    doc.text('This is a computer-generated invoice and does not require a signature.', 50, y + 14, {
      width: pageWidth,
      align: 'center',
    });
  }
}
