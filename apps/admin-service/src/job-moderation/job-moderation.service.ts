import { Injectable, Inject, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and, or, ilike, desc, sql } from 'drizzle-orm';
import { Database, jobs, activityLogs } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { ListJobsForModerationDto, ModerateJobDto, FlagJobDto, BulkModerateDto } from './dto';

@Injectable()
export class JobModerationService {
  private readonly logger = new Logger(JobModerationService.name);

  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async listJobsForModeration(companyId: string | null, dto: ListJobsForModerationDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    // Company scoping for admin users (super_admin sees all)
    if (companyId) {
      conditions.push(eq(jobs.companyId, companyId));
      this.logger.log(`Filtering jobs by company: ${companyId}`);
    }

    // Filter by active status (true = active, false = inactive/pending)
    if (dto.status === 'active') {
      conditions.push(eq(jobs.isActive, true));
    } else if (dto.status === 'pending' || dto.status === 'inactive') {
      conditions.push(eq(jobs.isActive, false));
    }

    if (dto.search) {
      conditions.push(
        or(ilike(jobs.title, `%${dto.search}%`), ilike(jobs.description, `%${dto.search}%`)),
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
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(jobs)
        .where(whereClause),
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

  async getJobForModeration(companyId: string | null, jobId: string) {
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

    // Company scope validation for admin users
    if (companyId && job.companyId !== companyId) {
      throw new ForbiddenException('You can only access jobs from your assigned company');
    }

    return job;
  }

  async moderateJob(adminId: string, companyId: string | null, jobId: string, dto: ModerateJobDto) {
    const job = await this.db.query.jobs.findFirst({
      where: eq(jobs.id, jobId),
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Company scope validation for admin users
    if (companyId && job.companyId !== companyId) {
      throw new ForbiddenException('You can only moderate jobs from your assigned company');
    }

    const isActive = dto.decision === 'approved';

    const [updated] = await this.db
      .update(jobs)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId))
      .returning();

    await this.logAudit(adminId, 'moderate_job', {
      jobId,
      companyId,
      decision: dto.decision,
      reason: dto.reason,
    });

    return updated;
  }

  async flagJob(adminId: string, companyId: string | null, jobId: string, dto: FlagJobDto) {
    const job = await this.db.query.jobs.findFirst({
      where: eq(jobs.id, jobId),
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Company scope validation for admin users
    if (companyId && job.companyId !== companyId) {
      throw new ForbiddenException('You can only flag jobs from your assigned company');
    }

    const [updated] = await this.db
      .update(jobs)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId))
      .returning();

    await this.logAudit(adminId, 'flag_job', {
      jobId,
      companyId,
      action: 'flagged',
      reason: dto.reason,
      category: dto.category,
    });

    return updated;
  }

  async bulkModerate(adminId: string, companyId: string | null, dto: BulkModerateDto) {
    const results: { jobId: string; success: boolean; error?: string }[] = [];

    for (const jobId of dto.jobIds) {
      try {
        await this.moderateJob(adminId, companyId, jobId, {
          decision: dto.action === 'approve' ? 'approved' : 'rejected',
          reason: dto.reason,
        });
        results.push({ jobId, success: true });
      } catch (error: any) {
        results.push({ jobId, success: false, error: error.message });
      }
    }

    return { results, processed: results.filter((r) => r.success).length };
  }

  async getModerationStats(companyId: string | null) {
    // Build where clauses with company scoping if needed
    const activeWhere = companyId
      ? and(eq(jobs.isActive, true), eq(jobs.companyId, companyId))
      : eq(jobs.isActive, true);

    const inactiveWhere = companyId
      ? and(eq(jobs.isActive, false), eq(jobs.companyId, companyId))
      : eq(jobs.isActive, false);

    const [activeCount, inactiveCount] = await Promise.all([
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(jobs)
        .where(activeWhere),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(jobs)
        .where(inactiveWhere),
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
    // Skip audit logging for system super admin (no user record in DB)
    const SUPER_ADMIN_UUID = '00000000-0000-0000-0000-000000000000';
    if (adminId === SUPER_ADMIN_UUID) {
      this.logger.log('Skipping audit log for system super admin');
      return;
    }

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
