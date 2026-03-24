import { Injectable, Logger } from '@nestjs/common';
import { S3Service } from '@ai-job-portal/aws';
import * as puppeteer from 'puppeteer';

@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  constructor(private readonly s3Service: S3Service) {}

  /**
   * Renders invoice HTML to a PDF buffer using Puppeteer.
   */
  async generatePdfBuffer(html: string): Promise<Buffer> {
    let browser: puppeteer.Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--font-render-hinting=none',
        ],
      });

      const page = await browser.newPage();

      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.evaluate(() => document.fonts.ready);

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      });

      return Buffer.from(pdfBuffer);
    } catch (error: any) {
      this.logger.error(`PDF generation failed: ${error.message}`);
      throw error;
    } finally {
      if (browser) {
        await browser.close().catch((err: any) => {
          this.logger.warn(`Failed to close browser: ${err.message}`);
        });
      }
    }
  }

  /**
   * Generates a PDF from invoice HTML and uploads it to S3.
   * Returns the S3 key (not public URL — invoices are private).
   */
  async generateAndUpload(invoiceNumber: string, html: string): Promise<string> {
    // 1. Generate PDF buffer
    const pdfBuffer = await this.generatePdfBuffer(html);

    // 2. Upload to S3
    const year = new Date().getFullYear();
    const s3Key = `invoices/${year}/${invoiceNumber}.pdf`;

    await this.s3Service.upload(s3Key, pdfBuffer, 'application/pdf');

    this.logger.log(`Invoice PDF uploaded: ${s3Key} (${pdfBuffer.length} bytes)`);

    // Return the S3 key — presigned URL will be generated at download time
    return s3Key;
  }

  /**
   * Generates a presigned download URL for an invoice PDF.
   * URL expires in 1 hour by default.
   */
  async getDownloadUrl(s3KeyOrUrl: string, expiresIn = 3600): Promise<string | null> {
    return this.s3Service.getSignedDownloadUrlFromKeyOrUrl(s3KeyOrUrl, expiresIn);
  }
}
