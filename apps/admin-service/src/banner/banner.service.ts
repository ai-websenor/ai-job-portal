import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, desc, and, asc, sql, lte, gte } from 'drizzle-orm';
import { Database, banners } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateBannerDto, UpdateBannerDto, BannerQueryDto, BannerPosition, TargetAudience } from './dto';

@Injectable()
export class BannerService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async create(createdBy: string, dto: CreateBannerDto) {
    const [banner] = await this.db.insert(banners).values({
      title: dto.title,
      imageUrl: dto.imageUrl,
      linkUrl: dto.linkUrl,
      position: dto.position,
      displayOrder: dto.displayOrder ?? 0,
      targetAudience: dto.targetAudience as any,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      isActive: dto.isActive ?? true,
      createdBy,
    }).returning();

    return banner;
  }

  async findAll(adminView = false) {
    if (adminView) {
      return this.db.query.banners.findMany({
        orderBy: [asc(banners.position), asc(banners.displayOrder)],
      });
    }

    // Public view: only active banners within date range
    const now = new Date();
    return this.db.query.banners.findMany({
      where: and(
        eq(banners.isActive, true),
        sql`(${banners.startDate} IS NULL OR ${banners.startDate} <= ${now})`,
        sql`(${banners.endDate} IS NULL OR ${banners.endDate} >= ${now})`,
      ),
      orderBy: [asc(banners.position), asc(banners.displayOrder)],
    });
  }

  async getByPosition(position: BannerPosition, audience?: TargetAudience) {
    const now = new Date();
    const allBanners = await this.db.query.banners.findMany({
      where: and(
        eq(banners.isActive, true),
        eq(banners.position, position),
        sql`(${banners.startDate} IS NULL OR ${banners.startDate} <= ${now})`,
        sql`(${banners.endDate} IS NULL OR ${banners.endDate} >= ${now})`,
      ),
      orderBy: [asc(banners.displayOrder)],
    });

    if (!audience) return allBanners;

    // Filter by audience
    return allBanners.filter(b =>
      !b.targetAudience ||
      b.targetAudience.length === 0 ||
      b.targetAudience.includes(audience)
    );
  }

  async findOne(id: string) {
    const banner = await this.db.query.banners.findFirst({
      where: eq(banners.id, id),
    });

    if (!banner) throw new NotFoundException('Banner not found');

    return banner;
  }

  async update(id: string, dto: UpdateBannerDto) {
    const updateData: any = { ...dto };

    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);

    const [updated] = await this.db.update(banners)
      .set(updateData)
      .where(eq(banners.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Banner not found');

    return updated;
  }

  async remove(id: string) {
    const banner = await this.db.query.banners.findFirst({
      where: eq(banners.id, id),
    });

    if (!banner) throw new NotFoundException('Banner not found');

    await this.db.delete(banners).where(eq(banners.id, id));

    return { success: true, message: 'Banner deleted' };
  }

  async reorder(position: BannerPosition, bannerIds: string[]) {
    // Update display order for all banners in the given position
    for (let i = 0; i < bannerIds.length; i++) {
      await this.db.update(banners)
        .set({ displayOrder: i })
        .where(and(
          eq(banners.id, bannerIds[i]),
          eq(banners.position, position),
        ));
    }

    return { success: true, message: 'Banners reordered' };
  }
}
