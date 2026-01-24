import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, or, ilike, desc, sql } from 'drizzle-orm';
import { Database, jobs, activityLogs, employers } from '@ai-job-portal/database';
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

    // Filter by active status (true = active, false = inactive/pending)
    if (dto.status === 'active') {
      conditions.push(eq(jobs.isActive, true));
    } else if (dto.status === 'pending' || dto.status === 'inactive') {
      conditions.push(eq(jobs.isActive, false));
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
          employer: true,
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
        employer: true,
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

    const isActive = dto.decision === 'approved';

    const [updated] = await this.db.update(jobs)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId))
      .returning();

    await this.logAudit(adminId, 'moderate_job', {
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
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId))
      .returning();

    await this.logAudit(adminId, 'flag_job', {
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
    const [activeCount, inactiveCount] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)` })
        .from(jobs)
        .where(eq(jobs.isActive, true)),
      this.db.select({ count: sql<number>`count(*)` })
        .from(jobs)
        .where(eq(jobs.isActive, false)),
    ]);

    return {
      byStatus: {
        active: Number(activeCount[0]?.count || 0),
        inactive: Number(inactiveCount[0]?.count || 0),
      },
      pendingQueue: Number(inactiveCount[0]?.count || 0),
    };
  }

  private async logAudit(adminId: string, action: string, details: Record<string, any>) {
    await this.db.insert(activityLogs).values({
      companyId: adminId, // Using adminId as placeholder
      userId: adminId,
      action,
      entityType: 'job',
      entityId: details.jobId,
      metadata: JSON.stringify(details),
    } as any);
  }
}
