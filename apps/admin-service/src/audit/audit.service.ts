import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { Database, auditLogs, users } from '@ai-job-portal/database';
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
      conditions.push(eq(auditLogs.userId, dto.userId));
    }
    if (dto.action) {
      conditions.push(eq(auditLogs.action, dto.action as any));
    }
    if (dto.entityType) {
      conditions.push(eq(auditLogs.entityType, dto.entityType));
    }
    if (dto.entityId) {
      conditions.push(eq(auditLogs.entityId, dto.entityId));
    }
    if (dto.startDate) {
      conditions.push(gte(auditLogs.createdAt, new Date(dto.startDate)));
    }
    if (dto.endDate) {
      conditions.push(lte(auditLogs.createdAt, new Date(dto.endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countResult] = await Promise.all([
      (this.db.query as any).auditLogs.findMany({
        where: whereClause,
        orderBy: [desc(auditLogs.createdAt)],
        limit,
        offset,
      }),
      this.db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(whereClause),
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
    return (this.db.query as any).auditLogs.findFirst({
      where: eq(auditLogs.id, id),
    });
  }

  async getEntityHistory(entityType: string, entityId: string) {
    return (this.db.query as any).auditLogs.findMany({
      where: and(
        eq(auditLogs.entityType, entityType),
        eq(auditLogs.entityId, entityId),
      ),
      orderBy: [desc(auditLogs.createdAt)],
    });
  }

  async getUserActivity(userId: string, limit = 100) {
    return (this.db.query as any).auditLogs.findMany({
      where: eq(auditLogs.userId, userId),
      orderBy: [desc(auditLogs.createdAt)],
      limit,
    });
  }

  async getActionSummary() {
    const result = await this.db.select({
      action: auditLogs.action,
      count: sql<number>`count(*)`,
    })
      .from(auditLogs)
      .groupBy(auditLogs.action)
      .orderBy(sql`count(*) desc`);

    return result;
  }

  async getRecentActivity(limit = 20) {
    return (this.db.query as any).auditLogs.findMany({
      orderBy: [desc(auditLogs.createdAt)],
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
    await this.db.insert(auditLogs).values({
      userId,
      action,
      entityType,
      entityId,
      oldData: details ? JSON.stringify(details) : null,
      ipAddress,
    } as any);
  }
}
