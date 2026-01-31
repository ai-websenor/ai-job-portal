import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { Database, companies, companyMedia } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateMediaDto, UpdateMediaDto } from './dto';

@Injectable()
export class MediaService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

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

  async create(userId: string, companyId: string, dto: CreateMediaDto) {
    await this.getCompanyAndVerify(userId, companyId);

    const [media] = await this.db.insert(companyMedia).values({
      companyId,
      ...dto,
    }).returning();

    return media;
  }

  async findAll(companyId: string) {
    return this.db.query.companyMedia.findMany({
      where: eq(companyMedia.companyId, companyId),
      orderBy: (m, { asc }) => [asc(m.displayOrder)],
    });
  }

  async findOne(companyId: string, id: string) {
    const media = await this.db.query.companyMedia.findFirst({
      where: and(eq(companyMedia.id, id), eq(companyMedia.companyId, companyId)),
    });

    if (!media) throw new NotFoundException('Media not found');
    return media;
  }

  async update(userId: string, companyId: string, id: string, dto: UpdateMediaDto) {
    await this.getCompanyAndVerify(userId, companyId);

    const existing = await this.db.query.companyMedia.findFirst({
      where: and(eq(companyMedia.id, id), eq(companyMedia.companyId, companyId)),
    });

    if (!existing) throw new NotFoundException('Media not found');

    await this.db.update(companyMedia)
      .set(dto)
      .where(eq(companyMedia.id, id));

    return this.findOne(companyId, id);
  }

  async remove(userId: string, companyId: string, id: string) {
    await this.getCompanyAndVerify(userId, companyId);

    const existing = await this.db.query.companyMedia.findFirst({
      where: and(eq(companyMedia.id, id), eq(companyMedia.companyId, companyId)),
    });

    if (!existing) throw new NotFoundException('Media not found');

    await this.db.delete(companyMedia).where(eq(companyMedia.id, id));

    return { success: true };
  }
}
