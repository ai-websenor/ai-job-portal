import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, or, ilike, desc, count, SQL } from 'drizzle-orm';
import { Database, moderationFlags } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { ListModerationDto, CreateModerationFlagDto, ReviewModerationDto } from './dto';

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async list(query: ListModerationDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];
    if (query.status) {
      conditions.push(eq(moderationFlags.status, query.status));
    }
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          ilike(moderationFlags.title, term),
          ilike(moderationFlags.author, term),
          ilike(moderationFlags.authorEmail, term),
          ilike(moderationFlags.flaggedReason, term),
        ) as SQL,
      );
    }
    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [rows, totalResult] = await Promise.all([
      (this.db.query as any).moderationFlags.findMany({
        where: whereClause,
        orderBy: [desc(moderationFlags.createdAt)],
        limit,
        offset,
      }),
      this.db.select({ total: count() }).from(moderationFlags).where(whereClause),
    ]);

    const total = totalResult[0]?.total || 0;

    return {
      message: 'Moderation flags fetched successfully',
      data: rows,
      pagination: {
        total,
        pageCount: Math.ceil(total / limit),
        currentPage: page,
        hasNextPage: page * limit < total,
      },
    };
  }

  async stats() {
    const [pending] = await this.db
      .select({ total: count() })
      .from(moderationFlags)
      .where(eq(moderationFlags.status, 'pending'));

    return { pending: pending?.total || 0 };
  }

  async findOne(id: string) {
    const flag = await (this.db.query as any).moderationFlags.findFirst({
      where: eq(moderationFlags.id, id),
    });

    if (!flag) {
      throw new NotFoundException('Moderation flag not found');
    }

    return flag;
  }

  async create(dto: CreateModerationFlagDto) {
    const [flag] = await this.db
      .insert(moderationFlags)
      .values({ ...dto } as any)
      .returning();

    return flag;
  }

  /** Approve = content is acceptable; mark the flag reviewed. */
  async approve(id: string, adminId: string, dto: ReviewModerationDto) {
    return this.setStatus(id, 'reviewed', adminId, dto.reviewNote);
  }

  /** Reject = content violates policy; mark the flag rejected. */
  async reject(id: string, adminId: string, dto: ReviewModerationDto) {
    return this.setStatus(id, 'rejected', adminId, dto.reviewNote);
  }

  async remove(id: string) {
    const [deleted] = await this.db
      .delete(moderationFlags)
      .where(eq(moderationFlags.id, id))
      .returning();

    if (!deleted) {
      throw new NotFoundException('Moderation flag not found');
    }

    return { success: true };
  }

  private async setStatus(
    id: string,
    status: 'reviewed' | 'rejected',
    adminId: string,
    reviewNote?: string,
  ) {
    const [updated] = await this.db
      .update(moderationFlags)
      .set({
        status,
        reviewNote: reviewNote ?? null,
        reviewedBy: adminId ?? null,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(moderationFlags.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException('Moderation flag not found');
    }

    return updated;
  }
}
