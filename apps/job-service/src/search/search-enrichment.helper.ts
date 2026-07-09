import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Database, savedJobs, jobApplications } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';

@Injectable()
export class SearchEnrichmentHelper {
  private static readonly REAPPLY_COOLDOWN_DAYS = 60;

  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async getSavedJobIds(userId?: string): Promise<Set<string>> {
    if (!userId) return new Set();

    const savedJobsList = await this.db
      .select({ jobId: savedJobs.jobId })
      .from(savedJobs)
      .where(eq(savedJobs.jobSeekerId, userId));

    return new Set(savedJobsList.map((s) => s.jobId));
  }

  async getAppliedJobsMap(
    userId?: string,
  ): Promise<Map<string, { appliedAt: Date; status: string; updatedAt: Date }>> {
    if (!userId) return new Map();

    const appliedList = await this.db
      .select({
        jobId: jobApplications.jobId,
        appliedAt: jobApplications.appliedAt,
        status: jobApplications.status,
        updatedAt: jobApplications.updatedAt,
      })
      .from(jobApplications)
      .where(eq(jobApplications.jobSeekerId, userId));

    return new Map(appliedList.map((a) => [a.jobId, a]));
  }

  mapUserFlags<T extends { id: string }>(
    jobsList: T[],
    savedJobIds: Set<string>,
    appliedJobsMap: Map<string, { appliedAt: Date; status: string; updatedAt: Date }>,
  ) {
    const now = new Date();
    return jobsList.map((job) => {
      const appInfo = appliedJobsMap.get(job.id);
      const isWithdrawn = appInfo?.status === 'withdrawn';

      let reapplyDaysLeft: number | null = null;
      if (isWithdrawn && appInfo) {
        const withdrawnAt = new Date(appInfo.updatedAt);
        const reapplyDate = new Date(withdrawnAt);
        reapplyDate.setDate(reapplyDate.getDate() + SearchEnrichmentHelper.REAPPLY_COOLDOWN_DAYS);
        const daysLeft = Math.ceil((reapplyDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        reapplyDaysLeft = daysLeft > 0 ? daysLeft : 0;
      }

      return {
        ...job,
        isSaved: savedJobIds.has(job.id),
        isApplied: appInfo ? !isWithdrawn : false,
        isAppliedAt: appInfo?.appliedAt || null,
        isWithdrawn,
        reapplyDaysLeft,
      };
    });
  }
}
