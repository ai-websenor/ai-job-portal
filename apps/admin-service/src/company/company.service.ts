import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, ilike, sql } from 'drizzle-orm';
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
    console.log('[createWithFiles] Starting company creation with files...');
    console.log(`[createWithFiles] userId: ${userId}, role: ${role}`);

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
    console.log('[createWithFiles] Parsing multipart form data...');
    const parts = req.parts();
    const fields: Record<string, any> = {};
    const files: { logo?: any; banner?: any; verificationDocument?: any } = {};

    for await (const part of parts) {
      if (part.type === 'file') {
        // Handle file fields
        const fieldName = part.fieldname;
        const buffer = await part.toBuffer();
        console.log(
          `[createWithFiles] Received file: ${fieldName} - ${part.filename} (${part.mimetype}, ${buffer.length} bytes)`,
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

    console.log(`[createWithFiles] Parsed fields:`, Object.keys(fields));
    console.log(`[createWithFiles] Parsed files:`, Object.keys(files));

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
      console.log(`[createWithFiles] Logo uploaded: ${logoUrl}`);
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
      console.log(`[createWithFiles] Banner uploaded: ${bannerUrl}`);
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
      console.log(`[createWithFiles] Verification document uploaded: ${verificationDocUrl}`);
    }

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

    console.log(`[createWithFiles] Company created with ID: ${company.id}`);

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
    return company;
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
    console.log(
      `[uploadLogo] Starting upload - userId: ${userId}, companyId: ${id}, role: ${role}`,
    );

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

    console.log(
      `[uploadLogo] Company found - company.userId: ${company.userId}, isSuperAdmin: ${role === 'super_admin'}`,
    );

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
        console.log(`[uploadLogo] Deleted old logo: ${key}`);
      } catch (error) {
        console.log(`[uploadLogo] Failed to delete old logo:`, error);
      }
    }

    const key = this.s3Service.generateKey('company-logos', file.originalname);
    console.log(`[uploadLogo] Uploading to S3 with key: ${key}`);

    const uploadResult = await this.s3Service.upload(key, file.buffer, file.mimetype);
    console.log(`[uploadLogo] S3 upload successful - URL: ${uploadResult.url}`);

    await this.db
      .update(companies)
      .set({ logoUrl: uploadResult.url, updatedAt: new Date() })
      .where(eq(companies.id, id));

    console.log(`[uploadLogo] Database updated with logo URL`);

    return { logoUrl: uploadResult.url };
  }

  async uploadBanner(
    userId: string,
    id: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    role?: string,
  ) {
    console.log(
      `[uploadBanner] Starting upload - userId: ${userId}, companyId: ${id}, role: ${role}`,
    );

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

    console.log(
      `[uploadBanner] Company found - company.userId: ${company.userId}, isSuperAdmin: ${role === 'super_admin'}`,
    );

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
        console.log(`[uploadBanner] Deleted old banner: ${key}`);
      } catch (error) {
        console.log(`[uploadBanner] Failed to delete old banner:`, error);
      }
    }

    const key = this.s3Service.generateKey('company-banners', file.originalname);
    console.log(`[uploadBanner] Uploading to S3 with key: ${key}`);

    const uploadResult = await this.s3Service.upload(key, file.buffer, file.mimetype);
    console.log(`[uploadBanner] S3 upload successful - URL: ${uploadResult.url}`);

    await this.db
      .update(companies)
      .set({ bannerUrl: uploadResult.url, updatedAt: new Date() })
      .where(eq(companies.id, id));

    console.log(`[uploadBanner] Database updated with banner URL`);

    return { bannerUrl: uploadResult.url };
  }

  async uploadVerificationDocument(
    userId: string,
    id: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    role?: string,
  ) {
    console.log(
      `[uploadVerificationDocument] Starting upload - userId: ${userId}, companyId: ${id}, role: ${role}`,
    );

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

    console.log(
      `[uploadVerificationDocument] Company found - company.userId: ${company.userId}, isSuperAdmin: ${role === 'super_admin'}`,
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
        console.log(`[uploadVerificationDocument] Deleted old document: ${key}`);
      } catch (error) {
        console.log(`[uploadVerificationDocument] Failed to delete old document:`, error);
      }
    }

    const key = this.s3Service.generateKey('company-verification-documents', file.originalname);
    console.log(`[uploadVerificationDocument] Uploading to S3 with key: ${key}`);

    const uploadResult = await this.s3Service.upload(key, file.buffer, file.mimetype);
    console.log(`[uploadVerificationDocument] S3 upload successful - URL: ${uploadResult.url}`);

    await this.db
      .update(companies)
      .set({
        verificationDocuments: uploadResult.url,
        kycDocuments: true,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, id));

    console.log(`[uploadVerificationDocument] Database updated with verification document URL`);

    return {
      verificationDocuments: uploadResult.url,
      kycDocuments: true,
    };
  }
}
