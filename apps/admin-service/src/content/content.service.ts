import { Injectable, Inject, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, or, and, desc } from 'drizzle-orm';
import { Database, cmsPages, emailTemplates, adminUsers } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreatePageDto, UpdatePageDto, CreateEmailTemplateDto } from './dto';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  private async getAdminUserId(userId: string): Promise<string | null> {
    // Look up by admin_users.userId (normal case) or admin_users.id (hardcoded super admin)
    const adminUser = await (this.db.query as any).adminUsers.findFirst({
      where: or(eq(adminUsers.userId, userId), eq(adminUsers.id, userId)),
      columns: { id: true },
    });
    return adminUser?.id || null;
  }

  // Pages (CMS)
  async createPage(userId: string, dto: CreatePageDto) {
    const existing = await (this.db.query as any).cmsPages.findFirst({
      where: eq(cmsPages.slug, dto.slug),
    });

    if (existing) {
      throw new ConflictException('Page with this slug already exists');
    }

    const adminUserId = await this.getAdminUserId(userId);

    const [page] = await this.db
      .insert(cmsPages)
      .values({
        slug: dto.slug,
        title: dto.title,
        content: dto.content,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        status: dto.isPublished ? 'published' : 'draft',
        createdBy: adminUserId,
        updatedBy: adminUserId,
      } as any)
      .returning();

    return page;
  }

  async updatePage(pageId: string, userId: string, dto: UpdatePageDto) {
    const adminUserId = await this.getAdminUserId(userId);
    const updateData: any = { ...dto, updatedAt: new Date(), updatedBy: adminUserId };
    if (dto.isPublished !== undefined) {
      updateData.status = dto.isPublished ? 'published' : 'draft';
      delete updateData.isPublished;
    }
    const [updated] = await this.db
      .update(cmsPages)
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

  async getPageBySlug(slug: string) {
    const page = await (this.db.query as any).cmsPages.findFirst({
      where: eq(cmsPages.slug, slug),
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    return page;
  }

  async getPublishedPageBySlug(slug: string) {
    const page = await (this.db.query as any).cmsPages.findFirst({
      where: and(eq(cmsPages.slug, slug), eq(cmsPages.status, 'published')),
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

    const [template] = await this.db
      .insert(emailTemplates)
      .values({
        name: dto.name,
        subject: dto.subject,
        htmlContent: dto.htmlContent,
        textContent: dto.textContent,
        variables: dto.variables ? JSON.stringify(dto.variables) : null,
      } as any)
      .returning();

    return template;
  }

  async updateEmailTemplate(templateId: string, dto: Partial<CreateEmailTemplateDto>) {
    const updateData: any = { ...dto, updatedAt: new Date() };
    if (dto.variables) {
      updateData.variables = JSON.stringify(dto.variables);
    }
    const [updated] = await this.db
      .update(emailTemplates)
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
