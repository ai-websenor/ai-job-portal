import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, or, ilike, desc, sql } from 'drizzle-orm';
import { Database, jobs, auditLogs, employerProfiles } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { ListJobsForModerationDto, ModerateJobDto, FlagJobDto, BulkModerateDto } from './dto';

@Injectable()
export class JobModerationService {
  private readonly logger = new Logger(JobModerationService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
  ) {}

  async listJobsForModeration(dto: ListJobsForModerationDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (dto.status) {
      conditions.push(eq(jobs.status, dto.status as any));
    }
    if (dto.search) {
      conditions.push(
        or(
          ilike(jobs.title, `%${dto.search}%`),
          ilike(jobs.description, `%${dto.search}%`),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countResult] = await Promise.all([
      (this.db.query as any).jobs.findMany({
        where: whereClause,
        orderBy: [desc(jobs.createdAt)],
        limit,
        offset,
        with: {
          employerProfile: true,
        },
      }),
      this.db.select({ count: sql<number>`count(*)` }).from(jobs).where(whereClause),
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

  async getJobForModeration(jobId: string) {
    const job = await (this.db.query as any).jobs.findFirst({
      where: eq(jobs.id, jobId),
      with: {
        employerProfile: true,
        category: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  async moderateJob(adminId: string, jobId: string, dto: ModerateJobDto) {
    const job = await this.db.query.jobs.findFirst({
      where: eq(jobs.id, jobId),
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const newStatus = dto.decision === 'approved' ? 'active' : 'closed';

    const [updated] = await this.db.update(jobs)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      } as any)
      .where(eq(jobs.id, jobId))
      .returning();

    await this.logAudit(adminId, 'update', {
      jobId,
      decision: dto.decision,
      reason: dto.reason,
    });

    return updated;
  }

  async flagJob(adminId: string, jobId: string, dto: FlagJobDto) {
    const job = await this.db.query.jobs.findFirst({
      where: eq(jobs.id, jobId),
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const [updated] = await this.db.update(jobs)
      .set({
        status: 'paused',
        updatedAt: new Date(),
      } as any)
      .where(eq(jobs.id, jobId))
      .returning();

    await this.logAudit(adminId, 'update', {
      jobId,
      action: 'flagged',
      reason: dto.reason,
      category: dto.category,
    });

    return updated;
  }

  async bulkModerate(adminId: string, dto: BulkModerateDto) {
    const results: { jobId: string; success: boolean; error?: string }[] = [];

    for (const jobId of dto.jobIds) {
      try {
        await this.moderateJob(adminId, jobId, {
          decision: dto.action === 'approve' ? 'approved' : 'rejected',
          reason: dto.reason,
        });
        results.push({ jobId, success: true });
      } catch (error: any) {
        results.push({ jobId, success: false, error: error.message });
      }
    }

    return { results, processed: results.filter(r => r.success).length };
  }

  async getModerationStats() {
    const stats = await this.db.select({
      status: jobs.status,
      count: sql<number>`count(*)`,
    })
      .from(jobs)
      .groupBy(jobs.status);

    const byStatus: Record<string, number> = {};
    stats.forEach(s => {
      byStatus[s.status || 'pending'] = Number(s.count);
    });

    // Get pending queue size
    const pendingCount = await this.db.select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(eq(jobs.status, 'pending'));

    return {
      byStatus,
      pendingQueue: Number(pendingCount[0]?.count || 0),
    };
  }

  private async logAudit(adminId: string, action: string, details: Record<string, any>) {
    await this.db.insert(auditLogs).values({
      userId: adminId,
      action,
      entityType: 'job',
      entityId: details.jobId,
      oldData: JSON.stringify(details),
    } as any);
  }
}
