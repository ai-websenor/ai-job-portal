import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { Database, announcements } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateAnnouncementDto, UpdateAnnouncementDto, TargetAudience } from './dto';

@Injectable()
export class AnnouncementService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async create(createdBy: string, dto: CreateAnnouncementDto) {
    const [announcement] = await this.db.insert(announcements).values({
      title: dto.title,
      content: dto.content,
      type: dto.type,
      targetAudience: dto.targetAudience as any,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      isDismissible: dto.isDismissible ?? true,
      isActive: dto.isActive ?? true,
      createdBy,
    }).returning();

    return announcement;
  }

  async findAll(adminView = false) {
    if (adminView) {
      return this.db.query.announcements.findMany({
        orderBy: [desc(announcements.createdAt)],
      });
    }

    // Public view: only active announcements within date range
    const now = new Date();
    return this.db.query.announcements.findMany({
      where: and(
        eq(announcements.isActive, true),
        lte(announcements.startDate, now),
        sql`(${announcements.endDate} IS NULL OR ${announcements.endDate} >= ${now})`,
      ),
      orderBy: [desc(announcements.startDate)],
    });
  }

  async getActiveForAudience(audience: TargetAudience) {
    const now = new Date();
    const allActive = await this.db.query.announcements.findMany({
      where: and(
        eq(announcements.isActive, true),
        lte(announcements.startDate, now),
        sql`(${announcements.endDate} IS NULL OR ${announcements.endDate} >= ${now})`,
      ),
      orderBy: [desc(announcements.startDate)],
    });

    // Filter by audience (include if no targetAudience set or if audience matches)
    return allActive.filter(a =>
      !a.targetAudience ||
      a.targetAudience.length === 0 ||
      a.targetAudience.includes(audience)
    );
  }

  async findOne(id: string) {
    const announcement = await this.db.query.announcements.findFirst({
      where: eq(announcements.id, id),
    });

    if (!announcement) throw new NotFoundException('Announcement not found');

    return announcement;
  }

  async update(id: string, dto: UpdateAnnouncementDto) {
    const updateData: any = { ...dto };

    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);

    const [updated] = await this.db.update(announcements)
      .set(updateData)
      .where(eq(announcements.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Announcement not found');

    return updated;
  }

  async remove(id: string) {
    const announcement = await this.db.query.announcements.findFirst({
      where: eq(announcements.id, id),
    });

    if (!announcement) throw new NotFoundException('Announcement not found');

    await this.db.delete(announcements).where(eq(announcements.id, id));

    return { success: true, message: 'Announcement deleted' };
  }
}
