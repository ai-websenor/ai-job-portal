import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { Database, activityLogs, users } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { ListAuditLogsDto } from './dto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
  ) {}

  async listAuditLogs(dto: ListAuditLogsDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 50;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (dto.userId) {
      conditions.push(eq(activityLogs.userId, dto.userId));
    }
    if (dto.action) {
      conditions.push(eq(activityLogs.action, dto.action as any));
    }
    if (dto.entityType) {
      conditions.push(eq(activityLogs.entityType, dto.entityType));
    }
    if (dto.entityId) {
      conditions.push(eq(activityLogs.entityId, dto.entityId));
    }
    if (dto.startDate) {
      conditions.push(gte(activityLogs.createdAt, new Date(dto.startDate)));
    }
    if (dto.endDate) {
      conditions.push(lte(activityLogs.createdAt, new Date(dto.endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countResult] = await Promise.all([
      (this.db.query as any).activityLogs.findMany({
        where: whereClause,
        orderBy: [desc(activityLogs.createdAt)],
        limit,
        offset,
      }),
      this.db.select({ count: sql<number>`count(*)` }).from(activityLogs).where(whereClause),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total: Number(countResult[0]?.count || 0),
        totalPages: Math.ceil(Number(countResult[0]?.count || 0) / limit),
      },
    };
  }

  async getAuditLog(id: string) {
    return (this.db.query as any).activityLogs.findFirst({
      where: eq(activityLogs.id, id),
    });
  }

  async getEntityHistory(entityType: string, entityId: string) {
    return (this.db.query as any).activityLogs.findMany({
      where: and(
        eq(activityLogs.entityType, entityType),
        eq(activityLogs.entityId, entityId),
      ),
      orderBy: [desc(activityLogs.createdAt)],
    });
  }

  async getUserActivity(userId: string, limit = 100) {
    return (this.db.query as any).activityLogs.findMany({
      where: eq(activityLogs.userId, userId),
      orderBy: [desc(activityLogs.createdAt)],
      limit,
    });
  }

  async getActionSummary() {
    const result = await this.db.select({
      action: activityLogs.action,
      count: sql<number>`count(*)`,
    })
      .from(activityLogs)
      .groupBy(activityLogs.action)
      .orderBy(sql`count(*) desc`);

    return result;
  }

  async getRecentActivity(limit = 20) {
    return (this.db.query as any).activityLogs.findMany({
      orderBy: [desc(activityLogs.createdAt)],
      limit,
    });
  }

  // Helper to log actions from other services
  async log(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    details?: Record<string, any>,
    ipAddress?: string,
  ) {
    await this.db.insert(activityLogs).values({
      userId,
      action,
      entityType,
      entityId,
      oldData: details ? JSON.stringify(details) : null,
      ipAddress,
    } as any);
  }
}
