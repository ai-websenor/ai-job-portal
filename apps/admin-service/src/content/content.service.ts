import { Injectable, Inject, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { Database, cmsPages, emailTemplates } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreatePageDto, UpdatePageDto, CreateFaqDto, CreateEmailTemplateDto } from './dto';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
  ) {}

  // Pages (CMS)
  async createPage(dto: CreatePageDto) {
    const existing = await (this.db.query as any).cmsPages.findFirst({
      where: eq(cmsPages.slug, dto.slug),
    });

    if (existing) {
      throw new ConflictException('Page with this slug already exists');
    }

    const [page] = await this.db.insert(cmsPages).values({
      slug: dto.slug,
      title: dto.title,
      content: dto.content,
      metaTitle: dto.metaTitle,
      metaDescription: dto.metaDescription,
      status: dto.isPublished ? 'published' : 'draft',
    } as any).returning();

    return page;
  }

  async updatePage(pageId: string, dto: UpdatePageDto) {
    const updateData: any = { ...dto, updatedAt: new Date() };
    if (dto.isPublished !== undefined) {
      updateData.status = dto.isPublished ? 'published' : 'draft';
      delete updateData.isPublished;
    }
    const [updated] = await this.db.update(cmsPages)
      .set(updateData)
      .where(eq(cmsPages.id, pageId))
      .returning();

    if (!updated) {
      throw new NotFoundException('Page not found');
    }

    return updated;
  }

  async deletePage(pageId: string) {
    await this.db.delete(cmsPages).where(eq(cmsPages.id, pageId));
    return { success: true };
  }

  async listPages() {
    return (this.db.query as any).cmsPages.findMany({
      orderBy: [desc(cmsPages.updatedAt)],
    });
  }

  async getPage(pageId: string) {
    const page = await (this.db.query as any).cmsPages.findFirst({
      where: eq(cmsPages.id, pageId),
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    return page;
  }

  // Email Templates
  async createEmailTemplate(dto: CreateEmailTemplateDto) {
    const existing = await (this.db.query as any).emailTemplates.findFirst({
      where: eq(emailTemplates.name, dto.name),
    });

    if (existing) {
      throw new ConflictException('Template with this name already exists');
    }

    const [template] = await this.db.insert(emailTemplates).values({
      name: dto.name,
      subject: dto.subject,
      htmlContent: dto.htmlContent,
      textContent: dto.textContent,
      variables: dto.variables ? JSON.stringify(dto.variables) : null,
    } as any).returning();

    return template;
  }

  async updateEmailTemplate(templateId: string, dto: Partial<CreateEmailTemplateDto>) {
    const updateData: any = { ...dto, updatedAt: new Date() };
    if (dto.variables) {
      updateData.variables = JSON.stringify(dto.variables);
    }
    const [updated] = await this.db.update(emailTemplates)
      .set(updateData)
      .where(eq(emailTemplates.id, templateId))
      .returning();

    if (!updated) {
      throw new NotFoundException('Template not found');
    }

    return updated;
  }

  async deleteEmailTemplate(templateId: string) {
    await this.db.delete(emailTemplates).where(eq(emailTemplates.id, templateId));
    return { success: true };
  }

  async listEmailTemplates() {
    return (this.db.query as any).emailTemplates.findMany({
      orderBy: [desc(emailTemplates.updatedAt)],
    });
  }
}
