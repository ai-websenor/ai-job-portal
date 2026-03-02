import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Database, companies, employers } from '@ai-job-portal/database';
import { S3Service } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import { UpdateCompanyDto } from './dto';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_BANNER_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class CompanyService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Resolve the employer's company from their userId.
   * Returns the company record after validating the employer has a company assigned.
   */
  private async resolveEmployerCompany(userId: string) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });

    if (!employer) {
      throw new NotFoundException('Employer profile not found');
    }

    if (!employer.companyId) {
      throw new ForbiddenException('No company assigned to this employer');
    }

    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, employer.companyId),
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  /**
   * Get company profile for a super_employer.
   * Looks up the company via the employer's companyId.
   * Sensitive fields (PAN, GST, CIN) are masked.
   */
  async getCompanyProfile(userId: string) {
    const company = await this.resolveEmployerCompany(userId);

    return company;
  }

  /**
   * Update company profile for a super_employer.
   * Restricted fields are stripped before update.
   */
  async updateCompanyProfile(userId: string, dto: UpdateCompanyDto) {
    const company = await this.resolveEmployerCompany(userId);

    // Strip any restricted fields that might have been passed
    const { ...allowedFields } = dto as any;

    // Remove restricted fields explicitly
    delete allowedFields.panNumber;
    delete allowedFields.gstNumber;
    delete allowedFields.cinNumber;
    delete allowedFields.logoUrl;
    delete allowedFields.verificationDocuments;
    delete allowedFields.kycDocuments;
    delete allowedFields.isVerified;
    delete allowedFields.verificationStatus;

    await this.db
      .update(companies)
      .set({
        ...allowedFields,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, company.id));

    const updatedCompany = await this.db.query.companies.findFirst({
      where: eq(companies.id, company.id),
    });

    if (!updatedCompany) {
      throw new NotFoundException('Company not found after update');
    }

    return updatedCompany;
  }

  /**
   * Upload company logo (JPEG, PNG, WebP, max 2MB).
   * Deletes the old logo from S3 if one exists.
   */
  async uploadLogo(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, WebP allowed');
    }
    if (file.size > MAX_LOGO_SIZE) {
      throw new BadRequestException('File too large. Max 2MB allowed');
    }

    const company = await this.resolveEmployerCompany(userId);

    // Delete old logo if exists
    if (company.logoUrl) {
      try {
        const key = this.s3Service.extractKeyFromUrl(company.logoUrl);
        await this.s3Service.delete(key);
      } catch {
        // Ignore delete errors for old files
      }
    }

    const key = this.s3Service.generateKey('company-logos', file.originalname);
    const uploadResult = await this.s3Service.upload(key, file.buffer, file.mimetype);

    await this.db
      .update(companies)
      .set({ logoUrl: uploadResult.url, updatedAt: new Date() })
      .where(eq(companies.id, company.id));

    return { logoUrl: uploadResult.url };
  }

  /**
   * Upload company banner (JPEG, PNG, WebP, max 5MB).
   * Deletes the old banner from S3 if one exists.
   */
  async uploadBanner(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, WebP allowed');
    }
    if (file.size > MAX_BANNER_SIZE) {
      throw new BadRequestException('File too large. Max 5MB allowed');
    }

    const company = await this.resolveEmployerCompany(userId);

    // Delete old banner if exists
    if (company.bannerUrl) {
      try {
        const key = this.s3Service.extractKeyFromUrl(company.bannerUrl);
        await this.s3Service.delete(key);
      } catch {
        // Ignore delete errors for old files
      }
    }

    const key = this.s3Service.generateKey('company-banners', file.originalname);
    const uploadResult = await this.s3Service.upload(key, file.buffer, file.mimetype);

    await this.db
      .update(companies)
      .set({ bannerUrl: uploadResult.url, updatedAt: new Date() })
      .where(eq(companies.id, company.id));

    return { bannerUrl: uploadResult.url };
  }

  /**
   * Generate a pre-signed URL for uploading a verification document (GST certificate).
   * The client uploads directly to S3 using this URL, then calls confirmVerificationDocUpload.
   */
  async generateVerificationDocUploadUrl(userId: string, fileName: string, contentType: string) {
    if (!ALLOWED_DOCUMENT_TYPES.includes(contentType)) {
      throw new BadRequestException('Invalid file type. Only JPG, PNG, PDF, DOC, DOCX allowed');
    }

    await this.resolveEmployerCompany(userId);

    const key = this.s3Service.generateKey('company-gst-documents', fileName);
    const expiresIn = 3600; // 1 hour
    const uploadUrl = await this.s3Service.getSignedUploadUrl(key, contentType, expiresIn);

    return {
      uploadUrl,
      key,
      expiresIn,
    };
  }

  /**
   * Confirm that a verification document was uploaded to S3.
   * Verifies the file exists, then updates the company record (gstDocumentUrl).
   */
  async confirmVerificationDocUpload(userId: string, key: string) {
    const company = await this.resolveEmployerCompany(userId);

    // Validate the key belongs to the correct S3 folder
    if (!key.startsWith('company-gst-documents/')) {
      throw new BadRequestException('Invalid document key');
    }

    // Verify the file actually exists in S3
    const exists = await this.s3Service.exists(key);
    if (!exists) {
      throw new BadRequestException(
        'Document not found in storage. Please upload the file first using the pre-signed URL.',
      );
    }

    // Delete old GST document if exists
    if (company.gstDocumentUrl) {
      try {
        const oldKey = this.s3Service.extractKeyFromUrl(company.gstDocumentUrl);
        if (oldKey !== key) {
          await this.s3Service.delete(oldKey);
        }
      } catch {
        // Ignore delete errors for old files
      }
    }

    // Generate the full S3 URL for the document
    const url = this.s3Service.getPublicUrl(key);

    await this.db
      .update(companies)
      .set({
        gstDocumentUrl: url,
        kycDocuments: true,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, company.id));

    return {
      gstDocumentUrl: url,
      kycDocuments: true,
    };
  }

  /**
   * Generate a pre-signed URL for viewing the verification document (GST certificate).
   * Returns a URL with inline content-disposition (opens in browser).
   */
  async getVerificationDocUrl(userId: string) {
    const company = await this.resolveEmployerCompany(userId);

    if (!company.gstDocumentUrl) {
      throw new NotFoundException('No verification document found for this company');
    }

    const key = this.s3Service.extractKeyFromUrl(company.gstDocumentUrl);
    const expiresIn = 3600;
    const url = await this.s3Service.getSignedDownloadUrl(key, expiresIn, 'inline');

    return { url, expiresIn };
  }

  /**
   * Mask sensitive string fields for security.
   * Example: "ABCDE1234F" -> "ABC****34F"
   */
  private maskString(value: string | null): string | null {
    if (!value || value.length <= 6) {
      return value ? '***' : null;
    }
    const visibleStart = 3;
    const visibleEnd = 2;
    return value.substring(0, visibleStart) + '****' + value.substring(value.length - visibleEnd);
  }
}
