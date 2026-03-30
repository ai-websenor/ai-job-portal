import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { S3Service } from '@ai-job-portal/aws';

const GST_REGEX = /\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}\b/;

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface GstValidationResult {
  gstNumber: string | null;
  extractedText: string;
  validationStatus: 'valid' | 'invalid';
}

@Injectable()
export class GstValidationService {
  private readonly logger = new Logger(GstValidationService.name);

  constructor(private readonly s3Service: S3Service) {}

  async validateGstDocument(s3Key: string): Promise<GstValidationResult> {
    // 1. Check file metadata (type + size)
    const metadata = await this.s3Service.headObject(s3Key);

    if (metadata.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `GST document exceeds the maximum allowed size of 5MB. Uploaded file size: ${(metadata.size / (1024 * 1024)).toFixed(2)}MB`,
      );
    }

    const contentType = metadata.contentType || '';
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      throw new BadRequestException('Invalid file type. Please upload PDF, JPG, or PNG.');
    }

    // 2. Download file from S3
    const objectStream = await this.s3Service.getObject(s3Key);
    const chunks: Buffer[] = [];
    for await (const chunk of objectStream as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }
    const fileBuffer = Buffer.concat(chunks);

    // 3. Extract text based on content type
    let extractedText = '';
    try {
      if (contentType === 'application/pdf') {
        extractedText = await this.extractTextFromPdf(fileBuffer);
      } else {
        extractedText = await this.extractTextFromImage(fileBuffer);
      }
    } catch (error: any) {
      this.logger.error(`OCR/text extraction failed: ${error.message}`);
      return {
        gstNumber: null,
        extractedText: '',
        validationStatus: 'invalid',
      };
    }

    // 4. Extract GST number using regex
    const gstMatch = extractedText.match(GST_REGEX);
    const gstNumber = gstMatch ? gstMatch[0] : null;

    // 5. Determine validation status
    const validationStatus = gstNumber ? 'valid' : 'invalid';

    if (!gstNumber) {
      this.logger.warn(`GST number could not be detected in document: ${s3Key}`);
    } else {
      this.logger.log(`GST number extracted: ${gstNumber} from document: ${s3Key}`);
    }

    return {
      gstNumber,
      extractedText: extractedText.substring(0, 5000), // Limit stored text
      validationStatus,
    };
  }

  private async extractTextFromPdf(buffer: Buffer): Promise<string> {
    const { PDFParse } = await import('pdf-parse');
    const pdf = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await pdf.getText();
      return result.text || '';
    } finally {
      await pdf.destroy().catch(() => {});
    }
  }

  private async extractTextFromImage(buffer: Buffer): Promise<string> {
    const Tesseract = await import('tesseract.js');
    const worker = await Tesseract.createWorker('eng');
    try {
      const { data } = await worker.recognize(buffer);
      return data.text || '';
    } finally {
      await worker.terminate();
    }
  }
}
