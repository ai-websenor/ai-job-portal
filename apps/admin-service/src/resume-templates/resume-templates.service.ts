import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, ilike, sql } from 'drizzle-orm';
import { Database, resumeTemplates } from '@ai-job-portal/database';
import { S3Service } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateResumeTemplateDto, UpdateResumeTemplateDto, ResumeTemplateQueryDto } from './dto';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_THUMBNAIL_SIZE = 2 * 1024 * 1024; // 2MB

@Injectable()
export class ResumeTemplatesService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly s3Service: S3Service,
  ) {}

  async create(dto: CreateResumeTemplateDto) {
    const [template] = await this.db
      .insert(resumeTemplates)
      .values({
        name: dto.name,
        templateType: dto.templateType,
        templateLevel: dto.templateLevel,
        templateHtml: dto.templateHtml,
        templateCss: dto.templateCss,
        thumbnailUrl: dto.thumbnailUrl,
        isPremium: dto.isPremium ?? false,
        isActive: dto.isActive ?? true,
        displayOrder: dto.displayOrder ?? 0,
      })
      .returning();

    return template;
  }

  async findAll(query: ResumeTemplateQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    let whereClause = sql`true`;

    if (query.templateType) {
      whereClause = and(whereClause, eq(resumeTemplates.templateType, query.templateType))!;
    }

    if (query.templateLevel) {
      whereClause = and(whereClause, eq(resumeTemplates.templateLevel, query.templateLevel))!;
    }

    if (query.isPremium !== undefined) {
      whereClause = and(whereClause, eq(resumeTemplates.isPremium, query.isPremium))!;
    }

    if (query.isActive !== undefined) {
      whereClause = and(whereClause, eq(resumeTemplates.isActive, query.isActive))!;
    }

    if (query.search) {
      whereClause = and(whereClause, ilike(resumeTemplates.name, `%${query.search}%`))!;
    }

    const templatesList = await this.db.query.resumeTemplates.findMany({
      where: whereClause,
      orderBy: (t, { asc, desc }) => [asc(t.displayOrder), desc(t.createdAt)],
      limit,
      offset,
    });

    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(resumeTemplates)
      .where(whereClause);

    const total = Number(totalResult[0]?.count || 0);
    const pageCount = Math.ceil(total / limit);

    return {
      data: templatesList,
      pagination: {
        totalTemplates: total,
        pageCount,
        currentPage: page,
        limit,
      },
    };
  }

  async findOne(id: string) {
    const template = await this.db.query.resumeTemplates.findFirst({
      where: eq(resumeTemplates.id, id),
    });

    if (!template) {
      throw new NotFoundException('Resume template not found');
    }

    return template;
  }

  async update(id: string, dto: UpdateResumeTemplateDto) {
    const _template = await this.findOne(id);

    await this.db
      .update(resumeTemplates)
      .set({
        ...(dto.name && { name: dto.name }),
        ...(dto.templateType !== undefined && { templateType: dto.templateType }),
        ...(dto.templateLevel !== undefined && { templateLevel: dto.templateLevel }),
        ...(dto.templateHtml && { templateHtml: dto.templateHtml }),
        ...(dto.templateCss !== undefined && { templateCss: dto.templateCss }),
        ...(dto.thumbnailUrl !== undefined && { thumbnailUrl: dto.thumbnailUrl }),
        ...(dto.isPremium !== undefined && { isPremium: dto.isPremium }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
      })
      .where(eq(resumeTemplates.id, id));

    return this.findOne(id);
  }

  async delete(id: string) {
    const template = await this.findOne(id);

    // Delete thumbnail from S3 if exists
    if (template.thumbnailUrl) {
      try {
        const url = new URL(template.thumbnailUrl);
        const key = url.pathname.slice(1);
        await this.s3Service.delete(key);
      } catch (error) {
        console.log(`Failed to delete thumbnail:`, error);
      }
    }

    await this.db.delete(resumeTemplates).where(eq(resumeTemplates.id, id));

    return { success: true, message: 'Resume template deleted successfully' };
  }

  async uploadThumbnail(
    id: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, WebP allowed');
    }
    if (file.size > MAX_THUMBNAIL_SIZE) {
      throw new BadRequestException('File too large. Max 2MB allowed');
    }

    const template = await this.findOne(id);

    // Delete old thumbnail if exists
    if (template.thumbnailUrl) {
      try {
        const url = new URL(template.thumbnailUrl);
        const key = url.pathname.slice(1);
        await this.s3Service.delete(key);
      } catch (error) {
        console.log(`Failed to delete old thumbnail:`, error);
      }
    }

    const key = this.s3Service.generateKey('resume-template-thumbnails', file.originalname);
    const uploadResult = await this.s3Service.upload(key, file.buffer, file.mimetype);

    await this.db
      .update(resumeTemplates)
      .set({ thumbnailUrl: uploadResult.url })
      .where(eq(resumeTemplates.id, id));

    return { thumbnailUrl: uploadResult.url };
  }

  async updateStatus(id: string, isActive: boolean) {
    await this.findOne(id);

    await this.db.update(resumeTemplates).set({ isActive }).where(eq(resumeTemplates.id, id));

    return this.findOne(id);
  }

  async updateOrder(id: string, displayOrder: number) {
    await this.findOne(id);

    await this.db.update(resumeTemplates).set({ displayOrder }).where(eq(resumeTemplates.id, id));

    return this.findOne(id);
  }
}
