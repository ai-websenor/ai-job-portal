import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { Database, savedSearches } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateSavedSearchDto, UpdateSavedSearchDto, SavedSearchQueryDto } from './dto';

@Injectable()
export class SavedSearchService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async create(userId: string, dto: CreateSavedSearchDto) {
    const [search] = await this.db.insert(savedSearches).values({
      userId,
      name: dto.name,
      searchCriteria: dto.searchCriteria,
      alertEnabled: dto.alertEnabled ?? true,
      alertFrequency: dto.alertFrequency || 'daily',
      alertChannels: dto.alertChannels,
    }).returning();

    return search;
  }

  async findAll(userId: string, query: SavedSearchQueryDto) {
    let whereClause = eq(savedSearches.userId, userId);

    if (query.isActive !== undefined) {
      whereClause = and(whereClause, eq(savedSearches.isActive, query.isActive))!;
    }

    if (query.alertEnabled !== undefined) {
      whereClause = and(whereClause, eq(savedSearches.alertEnabled, query.alertEnabled))!;
    }

    return this.db.query.savedSearches.findMany({
      where: whereClause,
      orderBy: (s, { desc }) => [desc(s.createdAt)],
    });
  }

  async findOne(userId: string, id: string) {
    const search = await this.db.query.savedSearches.findFirst({
      where: and(eq(savedSearches.id, id), eq(savedSearches.userId, userId)),
    });

    if (!search) throw new NotFoundException('Saved search not found');
    return search;
  }

  async update(userId: string, id: string, dto: UpdateSavedSearchDto) {
    const existing = await this.db.query.savedSearches.findFirst({
      where: and(eq(savedSearches.id, id), eq(savedSearches.userId, userId)),
    });

    if (!existing) throw new NotFoundException('Saved search not found');

    await this.db.update(savedSearches)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(savedSearches.id, id));

    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    const existing = await this.db.query.savedSearches.findFirst({
      where: and(eq(savedSearches.id, id), eq(savedSearches.userId, userId)),
    });

    if (!existing) throw new NotFoundException('Saved search not found');

    await this.db.delete(savedSearches).where(eq(savedSearches.id, id));

    return { success: true };
  }

  async toggleAlerts(userId: string, id: string) {
    const existing = await this.db.query.savedSearches.findFirst({
      where: and(eq(savedSearches.id, id), eq(savedSearches.userId, userId)),
    });

    if (!existing) throw new NotFoundException('Saved search not found');

    await this.db.update(savedSearches)
      .set({ alertEnabled: !existing.alertEnabled, updatedAt: new Date() })
      .where(eq(savedSearches.id, id));

    return this.findOne(userId, id);
  }
}
