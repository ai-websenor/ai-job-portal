import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Database, companies, companyPages } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateCareerPageDto, UpdateCareerPageDto } from './dto';

@Injectable()
export class CareerPageService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  private generateSlug(companyName: string): string {
    return companyName.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      + '-careers';
  }

  private async getCompanyAndVerify(userId: string, companyId: string) {
    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });

    if (!company) throw new NotFoundException('Company not found');
    if (company.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    return company;
  }

  async getCareerPage(companyId: string) {
    const page = await this.db.query.companyPages.findFirst({
      where: eq(companyPages.companyId, companyId),
    });

    return page;
  }

  async getCareerPageBySlug(slug: string) {
    const page = await this.db.query.companyPages.findFirst({
      where: eq(companyPages.slug, slug),
    });

    if (!page) throw new NotFoundException('Career page not found');
    if (!page.isPublished) throw new NotFoundException('Career page not found');

    return page;
  }

  async createOrUpdate(userId: string, companyId: string, dto: CreateCareerPageDto | UpdateCareerPageDto) {
    const company = await this.getCompanyAndVerify(userId, companyId);

    const existing = await this.db.query.companyPages.findFirst({
      where: eq(companyPages.companyId, companyId),
    });

    if (existing) {
      await this.db.update(companyPages)
        .set({ ...dto, updatedAt: new Date() })
        .where(eq(companyPages.id, existing.id));

      return this.getCareerPage(companyId);
    }

    const slug = this.generateSlug(company.name);

    const [page] = await this.db.insert(companyPages).values({
      companyId,
      slug,
      ...dto,
    }).returning();

    return page;
  }

  async publish(userId: string, companyId: string) {
    await this.getCompanyAndVerify(userId, companyId);

    const page = await this.db.query.companyPages.findFirst({
      where: eq(companyPages.companyId, companyId),
    });

    if (!page) throw new NotFoundException('Career page not found. Create one first.');

    await this.db.update(companyPages)
      .set({ isPublished: true, updatedAt: new Date() })
      .where(eq(companyPages.id, page.id));

    return { success: true, slug: page.slug };
  }

  async unpublish(userId: string, companyId: string) {
    await this.getCompanyAndVerify(userId, companyId);

    const page = await this.db.query.companyPages.findFirst({
      where: eq(companyPages.companyId, companyId),
    });

    if (!page) throw new NotFoundException('Career page not found');

    await this.db.update(companyPages)
      .set({ isPublished: false, updatedAt: new Date() })
      .where(eq(companyPages.id, page.id));

    return { success: true };
  }
}
