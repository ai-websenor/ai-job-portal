import { Injectable, Inject, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { eq, and, ilike, sql } from 'drizzle-orm';
import { Database, companies, employers } from '@ai-job-portal/database';
import { S3Service } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateCompanyDto, UpdateCompanyDto, CompanyQueryDto } from './dto';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_BANNER_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class CompanyService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly s3Service: S3Service,
  ) {}

  private generateSlug(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      + '-' + Date.now().toString(36);
  }

  async create(userId: string, dto: CreateCompanyDto) {
    // Check if user already has a company
    const existingCompany = await this.db.query.companies.findFirst({
      where: eq(companies.userId, userId),
    });

    if (existingCompany) {
      throw new ConflictException('You already have a company registered');
    }

    const slug = this.generateSlug(dto.name);

    const [company] = await this.db.insert(companies).values({
      userId,
      slug,
      ...dto,
    }).returning();

    // Link to employer record if exists
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });

    if (employer) {
      await this.db.update(employers)
        .set({ companyId: company.id })
        .where(eq(employers.id, employer.id));
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

    return {
      data: companiesList,
      meta: {
        total: Number(totalResult[0]?.count || 0),
        page,
        limit,
        totalPages: Math.ceil(Number(totalResult[0]?.count || 0) / limit),
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

  async update(userId: string, id: string, dto: UpdateCompanyDto) {
    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, id),
    });

    if (!company) throw new NotFoundException('Company not found');
    if (company.userId !== userId) {
      throw new ForbiddenException('Not authorized to update this company');
    }

    await this.db.update(companies)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(companies.id, id));

    return this.findOne(id);
  }

  async delete(userId: string, id: string) {
    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, id),
    });

    if (!company) throw new NotFoundException('Company not found');
    if (company.userId !== userId) {
      throw new ForbiddenException('Not authorized to delete this company');
    }

    await this.db.delete(companies).where(eq(companies.id, id));

    return { success: true };
  }

  async uploadLogo(
    userId: string,
    id: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
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
    if (company.userId !== userId) {
      throw new ForbiddenException('Not authorized to update this company');
    }

    // Delete old logo if exists
    if (company.logoUrl) {
      try {
        const url = new URL(company.logoUrl);
        const key = url.pathname.slice(1);
        await this.s3Service.delete(key);
      } catch {
        // Ignore delete errors
      }
    }

    const key = this.s3Service.generateKey('company-logos', file.originalname);
    const uploadResult = await this.s3Service.upload(key, file.buffer, file.mimetype);

    await this.db
      .update(companies)
      .set({ logoUrl: uploadResult.url, updatedAt: new Date() })
      .where(eq(companies.id, id));

    return { logoUrl: uploadResult.url };
  }

  async uploadBanner(
    userId: string,
    id: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
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
    if (company.userId !== userId) {
      throw new ForbiddenException('Not authorized to update this company');
    }

    // Delete old banner if exists
    if (company.bannerUrl) {
      try {
        const url = new URL(company.bannerUrl);
        const key = url.pathname.slice(1);
        await this.s3Service.delete(key);
      } catch {
        // Ignore delete errors
      }
    }

    const key = this.s3Service.generateKey('company-banners', file.originalname);
    const uploadResult = await this.s3Service.upload(key, file.buffer, file.mimetype);

    await this.db
      .update(companies)
      .set({ bannerUrl: uploadResult.url, updatedAt: new Date() })
      .where(eq(companies.id, id));

    return { bannerUrl: uploadResult.url };
  }
}
