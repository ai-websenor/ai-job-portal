/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, ilike, sql, ne } from 'drizzle-orm';
import { Database, companies, employers } from '@ai-job-portal/database';
import { S3Service } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateCompanyDto, UpdateCompanyDto, CompanyQueryDto } from './dto';
import { FastifyRequest } from 'fastify';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
];
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_BANNER_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly s3Service: S3Service,
  ) {}

  private generateSlug(name: string): string {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') +
      '-' +
      Date.now().toString(36)
    );
  }

  /**
   * Validates that PAN, GST, and CIN numbers are unique across all companies.
   * Pass excludeCompanyId to skip a specific company (for updates).
   */
  private async validateUniqueRegistrationNumbers(
    panNumber?: string | null,
    gstNumber?: string | null,
    cinNumber?: string | null,
    excludeCompanyId?: string,
  ) {
    if (panNumber) {
      const existing = await this.db.query.companies.findFirst({
        where: excludeCompanyId
          ? and(eq(companies.panNumber, panNumber), ne(companies.id, excludeCompanyId))
          : eq(companies.panNumber, panNumber),
        columns: { id: true },
      });
      if (existing) {
        throw new ConflictException('A company with this PAN number already exists');
      }
    }

    if (gstNumber) {
      const existing = await this.db.query.companies.findFirst({
        where: excludeCompanyId
          ? and(eq(companies.gstNumber, gstNumber), ne(companies.id, excludeCompanyId))
          : eq(companies.gstNumber, gstNumber),
        columns: { id: true },
      });
      if (existing) {
        throw new ConflictException('A company with this GST number already exists');
      }
    }

    if (cinNumber) {
      const existing = await this.db.query.companies.findFirst({
        where: excludeCompanyId
          ? and(eq(companies.cinNumber, cinNumber), ne(companies.id, excludeCompanyId))
          : eq(companies.cinNumber, cinNumber),
        columns: { id: true },
      });
      if (existing) {
        throw new ConflictException('A company with this CIN number already exists');
      }
    }
  }

  async create(userId: string, dto: CreateCompanyDto, role?: string) {
    const isSuperAdmin = role === 'super_admin';

    // For super_admin, skip the "already has company" check
    if (!isSuperAdmin) {
      const existingCompany = await this.db.query.companies.findFirst({
        where: eq(companies.userId, userId),
      });

      if (existingCompany) {
        throw new ConflictException('You already have a company registered');
      }
    }

    await this.validateUniqueRegistrationNumbers(dto.panNumber, dto.gstNumber, dto.cinNumber);

    const slug = this.generateSlug(dto.name);

    // Prepare company data - exclude userId for super_admin
    const companyData: any = {
      name: dto.name,
      slug,
      industry: dto.industry,
      companySize: dto.companySize,
      companyType: dto.companyType,
      yearEstablished: dto.yearEstablished,
      website: dto.website,
      description: dto.description,
      mission: dto.mission,
      culture: dto.culture,
      benefits: dto.benefits,
      logoUrl: dto.logoUrl,
      bannerUrl: dto.bannerUrl,
      tagline: dto.tagline,
      headquarters: dto.headquarters,
      country: dto.country,
      state: dto.state,
      stateCode: dto.stateCode,
      city: dto.city,
      address: dto.address,
      pincode: dto.pincode,
      billingEmail: dto.billingEmail,
      billingPhone: dto.billingPhone,
      employeeCount: dto.employeeCount,
      linkedinUrl: dto.linkedinUrl,
      twitterUrl: dto.twitterUrl,
      facebookUrl: dto.facebookUrl,
      panNumber: dto.panNumber,
      gstNumber: dto.gstNumber,
      cinNumber: dto.cinNumber,
    };

    // Only set userId for non-admin users
    if (!isSuperAdmin) {
      companyData.userId = userId;
    }

    const [company] = await this.db.insert(companies).values(companyData).returning();

    // Link to employer record if exists (only for non-admin users)
    if (!isSuperAdmin) {
      const employer = await this.db.query.employers.findFirst({
        where: eq(employers.userId, userId),
      });

      if (employer) {
        await this.db
          .update(employers)
          .set({ companyId: company.id })
          .where(eq(employers.id, employer.id));
      }
    }

    return company;
  }

  /**
   * Create company with file uploads (logo, banner, verification document)
   * Supports multipart/form-data with text fields and optional files
   */
  async createWithFiles(userId: string, req: FastifyRequest, role?: string) {
    this.logger.debug(`createWithFiles - starting, userId: ${userId}, role: ${role}`);

    const isSuperAdmin = role === 'super_admin';

    // For super_admin, skip the "already has company" check
    if (!isSuperAdmin) {
      const existingCompany = await this.db.query.companies.findFirst({
        where: eq(companies.userId, userId),
      });

      if (existingCompany) {
        throw new ConflictException('You already have a company registered');
      }
    }

    // Parse multipart form data
    this.logger.debug('createWithFiles - parsing multipart form data');
    const parts = req.parts();
    const fields: Record<string, any> = {};
    const files: { logo?: any; banner?: any; verificationDocument?: any } = {};

    for await (const part of parts) {
      if (part.type === 'file') {
        // Handle file fields
        const fieldName = part.fieldname;
        const buffer = await part.toBuffer();
        this.logger.debug(
          `createWithFiles - received file: ${fieldName} - ${part.filename} (${part.mimetype}, ${buffer.length} bytes)`,
        );

        if (fieldName === 'logo') {
          files.logo = {
            buffer,
            originalname: part.filename,
            mimetype: part.mimetype,
            size: buffer.length,
          };
        } else if (fieldName === 'banner') {
          files.banner = {
            buffer,
            originalname: part.filename,
            mimetype: part.mimetype,
            size: buffer.length,
          };
        } else if (fieldName === 'verificationDocument') {
          files.verificationDocument = {
            buffer,
            originalname: part.filename,
            mimetype: part.mimetype,
            size: buffer.length,
          };
        }
      } else {
        // Handle text fields
        fields[part.fieldname] = part.value;
      }
    }

    this.logger.debug(`createWithFiles - parsed fields: ${Object.keys(fields).join(', ')}`);
    this.logger.debug(`createWithFiles - parsed files: ${Object.keys(files).join(', ')}`);

    // Convert string numbers to actual numbers
    if (fields.yearEstablished) fields.yearEstablished = parseInt(fields.yearEstablished);
    if (fields.employeeCount) fields.employeeCount = parseInt(fields.employeeCount);

    // Upload files to S3 and get URLs
    let logoUrl: string | undefined;
    let bannerUrl: string | undefined;
    let verificationDocUrl: string | undefined;

    // Upload logo
    if (files.logo) {
      if (!ALLOWED_IMAGE_TYPES.includes(files.logo.mimetype)) {
        throw new BadRequestException('Invalid logo file type. Only JPEG, PNG, WebP allowed');
      }
      if (files.logo.size > MAX_LOGO_SIZE) {
        throw new BadRequestException('Logo file too large. Max 2MB allowed');
      }
      const key = this.s3Service.generateKey('company-logos', files.logo.originalname);
      const uploadResult = await this.s3Service.upload(key, files.logo.buffer, files.logo.mimetype);
      logoUrl = uploadResult.url;
      this.logger.debug('createWithFiles - logo uploaded successfully');
    }

    // Upload banner
    if (files.banner) {
      if (!ALLOWED_IMAGE_TYPES.includes(files.banner.mimetype)) {
        throw new BadRequestException('Invalid banner file type. Only JPEG, PNG, WebP allowed');
      }
      if (files.banner.size > MAX_BANNER_SIZE) {
        throw new BadRequestException('Banner file too large. Max 5MB allowed');
      }
      const key = this.s3Service.generateKey('company-banners', files.banner.originalname);
      const uploadResult = await this.s3Service.upload(
        key,
        files.banner.buffer,
        files.banner.mimetype,
      );
      bannerUrl = uploadResult.url;
      this.logger.debug('createWithFiles - banner uploaded successfully');
    }

    // Upload verification document
    if (files.verificationDocument) {
      if (!ALLOWED_DOCUMENT_TYPES.includes(files.verificationDocument.mimetype)) {
        throw new BadRequestException(
          'Invalid verification document type. Only JPG, PNG, PDF, DOC, DOCX allowed',
        );
      }
      if (files.verificationDocument.size > MAX_DOCUMENT_SIZE) {
        throw new BadRequestException('Verification document too large. Max 10MB allowed');
      }
      const key = this.s3Service.generateKey(
        'company-verification-documents',
        files.verificationDocument.originalname,
      );
      const uploadResult = await this.s3Service.upload(
        key,
        files.verificationDocument.buffer,
        files.verificationDocument.mimetype,
      );
      verificationDocUrl = uploadResult.url;
      this.logger.debug('createWithFiles - verification document uploaded successfully');
    }

    await this.validateUniqueRegistrationNumbers(
      fields.panNumber,
      fields.gstNumber,
      fields.cinNumber,
    );

    // Generate slug
    const slug = this.generateSlug(fields.name);

    // Prepare company data
    const companyData: any = {
      name: fields.name,
      slug,
      industry: fields.industry,
      companySize: fields.companySize,
      companyType: fields.companyType,
      yearEstablished: fields.yearEstablished,
      website: fields.website,
      description: fields.description,
      mission: fields.mission,
      culture: fields.culture,
      benefits: fields.benefits,
      logoUrl: logoUrl || fields.logoUrl, // Use uploaded file or provided URL
      bannerUrl: bannerUrl || fields.bannerUrl, // Use uploaded file or provided URL
      tagline: fields.tagline,
      headquarters: fields.headquarters,
      country: fields.country,
      state: fields.state,
      stateCode: fields.stateCode,
      city: fields.city,
      address: fields.address,
      pincode: fields.pincode,
      billingEmail: fields.billingEmail,
      billingPhone: fields.billingPhone,
      employeeCount: fields.employeeCount,
      linkedinUrl: fields.linkedinUrl,
      twitterUrl: fields.twitterUrl,
      facebookUrl: fields.facebookUrl,
      panNumber: fields.panNumber,
      gstNumber: fields.gstNumber,
      cinNumber: fields.cinNumber,
      verificationDocuments: verificationDocUrl,
      kycDocuments: verificationDocUrl ? true : false,
    };

    // Only set userId for non-admin users
    if (!isSuperAdmin) {
      companyData.userId = userId;
    }

    const [company] = await this.db.insert(companies).values(companyData).returning();

    this.logger.debug(`createWithFiles - company created with ID: ${company.id}`);

    // Link to employer record if exists (only for non-admin users)
    if (!isSuperAdmin) {
      const employer = await this.db.query.employers.findFirst({
        where: eq(employers.userId, userId),
      });

      if (employer) {
        await this.db
          .update(employers)
          .set({ companyId: company.id })
          .where(eq(employers.id, employer.id));
      }
    }

    return company;
  }

  async findAll(query: CompanyQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    let whereClause = sql`true`;

    if (query.industry) {
      whereClause = and(whereClause, eq(companies.industry, query.industry))!;
    }

    if (query.isVerified !== undefined) {
      whereClause = and(whereClause, eq(companies.isVerified, query.isVerified))!;
    }

    if (query.search) {
      whereClause = and(whereClause, ilike(companies.name, `%${query.search}%`))!;
    }

    const companiesList = await this.db.query.companies.findMany({
      where: whereClause,
      orderBy: (c, { desc }) => [desc(c.createdAt)],
      limit,
      offset,
    });

    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(companies)
      .where(whereClause);

    const total = Number(totalResult[0]?.count || 0);
    const pageCount = Math.ceil(total / limit);

    return {
      data: companiesList,
      pagination: {
        totalCompanies: total,
        pageCount,
        currentPage: page,
        hasNextPage: page < pageCount,
      },
    };
  }

  async findOne(id: string) {
    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, id),
    });

    if (!company) throw new NotFoundException('Company not found');

    // Generate signed URLs for private documents
    const result: Record<string, any> = { ...company };
    if (company.gstDocumentUrl) {
      result.gstDocumentUrl = await this.s3Service.getSignedDownloadUrlFromKeyOrUrl(
        company.gstDocumentUrl,
        3600,
      );
    }
    if (company.verificationDocuments) {
      result.verificationDocuments = await this.s3Service.getSignedDownloadUrlFromKeyOrUrl(
        company.verificationDocuments,
        3600,
      );
    }

    return result;
  }

  async findBySlug(slug: string) {
    const company = await this.db.query.companies.findFirst({
      where: eq(companies.slug, slug),
    });

    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async getMyCompany(userId: string) {
    const company = await this.db.query.companies.findFirst({
      where: eq(companies.userId, userId),
    });

    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async update(userId: string, id: string, dto: UpdateCompanyDto, role?: string) {
    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, id),
    });

    if (!company) throw new NotFoundException('Company not found');

    const isSuperAdmin = role === 'super_admin';

    // Super admin can update any company, others can only update their own
    if (!isSuperAdmin && company.userId !== userId) {
      throw new ForbiddenException('Not authorized to update this company');
    }

    // Validate uniqueness of PAN/GST/CIN if being updated
    const dtoAny = dto as any;
    await this.validateUniqueRegistrationNumbers(
      dtoAny.panNumber,
      dtoAny.gstNumber,
      dtoAny.cinNumber,
      id,
    );

    await this.db
      .update(companies)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(companies.id, id));

    return this.findOne(id);
  }

  async delete(userId: string, id: string, role?: string) {
    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, id),
    });

    if (!company) throw new NotFoundException('Company not found');

    const isSuperAdmin = role === 'super_admin';

    // Super admin can delete any company, others can only delete their own
    if (!isSuperAdmin && company.userId !== userId) {
      throw new ForbiddenException('Not authorized to delete this company');
    }

    await this.db.delete(companies).where(eq(companies.id, id));

    return { success: true };
  }

  async uploadLogo(
    userId: string,
    id: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    role?: string,
  ) {
    this.logger.debug(`uploadLogo - starting, companyId: ${id}, role: ${role}`);

    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, WebP allowed');
    }
    if (file.size > MAX_LOGO_SIZE) {
      throw new BadRequestException('File too large. Max 2MB allowed');
    }

    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, id),
    });
    if (!company) throw new NotFoundException('Company not found');

    this.logger.debug(`uploadLogo - company found, isSuperAdmin: ${role === 'super_admin'}`);

    const isSuperAdmin = role === 'super_admin';

    // Super admin can upload for any company, others can only upload for their own
    if (!isSuperAdmin && company.userId !== userId) {
      throw new ForbiddenException('Not authorized to update this company');
    }

    // Delete old logo if exists
    if (company.logoUrl) {
      try {
        const url = new URL(company.logoUrl);
        const key = url.pathname.slice(1);
        await this.s3Service.delete(key);
        this.logger.debug(`uploadLogo - deleted old logo: ${key}`);
      } catch (error) {
        this.logger.warn(`uploadLogo - failed to delete old logo: ${error}`);
      }
    }

    const key = this.s3Service.generateKey('company-logos', file.originalname);
    this.logger.debug(`uploadLogo - uploading to S3, key: ${key}`);

    const uploadResult = await this.s3Service.upload(key, file.buffer, file.mimetype);
    this.logger.debug('uploadLogo - S3 upload successful');

    await this.db
      .update(companies)
      .set({ logoUrl: uploadResult.url, updatedAt: new Date() })
      .where(eq(companies.id, id));

    this.logger.debug('uploadLogo - database updated with logo URL');

    return { logoUrl: uploadResult.url };
  }

  async uploadBanner(
    userId: string,
    id: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    role?: string,
  ) {
    this.logger.debug(`uploadBanner - starting, companyId: ${id}, role: ${role}`);

    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, WebP allowed');
    }
    if (file.size > MAX_BANNER_SIZE) {
      throw new BadRequestException('File too large. Max 5MB allowed');
    }

    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, id),
    });
    if (!company) throw new NotFoundException('Company not found');

    this.logger.debug(`uploadBanner - company found, isSuperAdmin: ${role === 'super_admin'}`);

    const isSuperAdmin = role === 'super_admin';

    // Super admin can upload for any company, others can only upload for their own
    if (!isSuperAdmin && company.userId !== userId) {
      throw new ForbiddenException('Not authorized to update this company');
    }

    // Delete old banner if exists
    if (company.bannerUrl) {
      try {
        const url = new URL(company.bannerUrl);
        const key = url.pathname.slice(1);
        await this.s3Service.delete(key);
        this.logger.debug(`uploadBanner - deleted old banner: ${key}`);
      } catch (error) {
        this.logger.warn(`uploadBanner - failed to delete old banner: ${error}`);
      }
    }

    const key = this.s3Service.generateKey('company-banners', file.originalname);
    this.logger.debug(`uploadBanner - uploading to S3, key: ${key}`);

    const uploadResult = await this.s3Service.upload(key, file.buffer, file.mimetype);
    this.logger.debug('uploadBanner - S3 upload successful');

    await this.db
      .update(companies)
      .set({ bannerUrl: uploadResult.url, updatedAt: new Date() })
      .where(eq(companies.id, id));

    this.logger.debug('uploadBanner - database updated with banner URL');

    return { bannerUrl: uploadResult.url };
  }

  async uploadVerificationDocument(
    userId: string,
    id: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    role?: string,
  ) {
    this.logger.debug(`uploadVerificationDocument - starting, companyId: ${id}, role: ${role}`);

    if (!ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPG, PNG, PDF, DOC, DOCX allowed');
    }
    if (file.size > MAX_DOCUMENT_SIZE) {
      throw new BadRequestException('File too large. Max 10MB allowed');
    }

    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, id),
    });
    if (!company) throw new NotFoundException('Company not found');

    this.logger.debug(
      `uploadVerificationDocument - company found, isSuperAdmin: ${role === 'super_admin'}`,
    );

    const isSuperAdmin = role === 'super_admin';

    // Super admin can upload for any company, others can only upload for their own
    if (!isSuperAdmin && company.userId !== userId) {
      throw new ForbiddenException('Not authorized to update this company');
    }

    // Delete old verification document if exists
    if (company.verificationDocuments) {
      try {
        const url = new URL(company.verificationDocuments);
        const key = url.pathname.slice(1);
        await this.s3Service.delete(key);
        this.logger.debug(`uploadVerificationDocument - deleted old document: ${key}`);
      } catch (error) {
        this.logger.warn(`uploadVerificationDocument - failed to delete old document: ${error}`);
      }
    }

    const key = this.s3Service.generateKey('company-verification-documents', file.originalname);
    this.logger.debug(`uploadVerificationDocument - uploading to S3, key: ${key}`);

    const uploadResult = await this.s3Service.upload(key, file.buffer, file.mimetype);
    this.logger.debug('uploadVerificationDocument - S3 upload successful');

    await this.db
      .update(companies)
      .set({
        verificationDocuments: uploadResult.url,
        kycDocuments: true,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, id));

    this.logger.debug('uploadVerificationDocument - database updated');

    return {
      verificationDocuments: uploadResult.url,
      kycDocuments: true,
    };
  }

  /**
   * Get admin's own company profile
   * Returns company details with masked sensitive fields
   */
  async getAdminCompanyProfile(companyId: string) {
    if (!companyId) {
      throw new ForbiddenException('Admin user does not have a company assigned');
    }

    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Mask sensitive fields for security
    return {
      ...company,
      panNumber: this.maskString(company.panNumber),
      gstNumber: this.maskString(company.gstNumber),
      cinNumber: this.maskString(company.cinNumber),
    };
  }

  /**
   * Update admin's own company profile with field restrictions
   * Admins cannot edit: panNumber, gstNumber, cinNumber, logoUrl, verificationDocuments, kycDocuments, isVerified, verificationStatus
   */
  async updateAdminCompanyProfile(companyId: string, dto: any) {
    if (!companyId) {
      throw new ForbiddenException('Admin user does not have a company assigned');
    }

    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Remove restricted fields from DTO if they were somehow included
    const {
      panNumber,
      gstNumber,
      cinNumber,
      logoUrl,
      verificationDocuments,
      kycDocuments,
      isVerified,
      verificationStatus,
      ...allowedFields
    } = dto;

    // Update only allowed fields
    await this.db
      .update(companies)
      .set({
        ...allowedFields,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId));

    // Fetch and return updated company with masked sensitive fields
    const updatedCompany = await this.db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });

    if (!updatedCompany) {
      throw new NotFoundException('Company not found after update');
    }

    return {
      ...updatedCompany,
      panNumber: this.maskString(updatedCompany.panNumber),
      gstNumber: this.maskString(updatedCompany.gstNumber),
      cinNumber: this.maskString(updatedCompany.cinNumber),
    };
  }

  /**
   * Mask sensitive string fields for security
   * Example: "ABCDE1234F" -> "ABC****34F"
   */
  private maskString(value: string | null): string | null {
    if (!value || value.length <= 6) {
      return value ? '***' : null;
    }
    const visibleStart = 3;
    const visibleEnd = 2;
    const masked =
      value.substring(0, visibleStart) + '****' + value.substring(value.length - visibleEnd);
    return masked;
  }
}
