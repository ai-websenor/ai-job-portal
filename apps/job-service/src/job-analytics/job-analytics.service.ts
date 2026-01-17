import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { Database, jobs, jobViews, jobShares, employers } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { TrackShareDto, AnalyticsQueryDto } from './dto';

@Injectable()
export class JobAnalyticsService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  private async verifyJobOwnership(userId: string, jobId: string) {
    const job = await this.db.query.jobs.findFirst({
      where: eq(jobs.id, jobId),
    });

    if (!job) throw new NotFoundException('Job not found');

    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.id, job.employerId),
    });

    if (!employer || employer.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    return job;
  }

  async trackView(jobId: string, userId: string | null, ipAddress: string, userAgent: string) {
    // Only track if user is logged in (for now)
    if (!userId) return { success: true };

    await this.db.insert(jobViews).values({
      jobId,
      userId,
      ipAddress,
      userAgent,
    });

    // Increment view count on job
    await this.db.update(jobs)
      .set({ viewCount: sql`${jobs.viewCount} + 1` })
      .where(eq(jobs.id, jobId));

    return { success: true };
  }

  async trackShare(jobId: string, userId: string | null, dto: TrackShareDto) {
    await this.db.insert(jobShares).values({
      jobId,
      userId,
      shareChannel: dto.shareChannel,
    });

    return { success: true, message: 'Share tracked' };
  }

  async getJobAnalytics(userId: string, jobId: string, query: AnalyticsQueryDto) {
    const job = await this.verifyJobOwnership(userId, jobId);

    // Total views
    const totalViewsResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(jobViews)
      .where(eq(jobViews.jobId, jobId));

    // Unique views
    const uniqueViewsResult = await this.db
      .select({ count: sql<number>`count(distinct ${jobViews.userId})` })
      .from(jobViews)
      .where(eq(jobViews.jobId, jobId));

    // Total shares
    const totalSharesResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(jobShares)
      .where(eq(jobShares.jobId, jobId));

    // Shares by channel
    const sharesByChannelResult = await this.db
      .select({
        channel: jobShares.shareChannel,
        count: sql<number>`count(*)`,
      })
      .from(jobShares)
      .where(eq(jobShares.jobId, jobId))
      .groupBy(jobShares.shareChannel);

    const sharesByChannel: Record<string, number> = {};
    sharesByChannelResult.forEach(r => {
      sharesByChannel[r.channel] = Number(r.count);
    });

    return {
      jobId,
      totalViews: Number(totalViewsResult[0]?.count || 0),
      uniqueViews: Number(uniqueViewsResult[0]?.count || 0),
      totalShares: Number(totalSharesResult[0]?.count || 0),
      applicationCount: job.applicationCount,
      sharesByChannel,
    };
  }

  async getShareStats(jobId: string) {
    const job = await this.db.query.jobs.findFirst({
      where: eq(jobs.id, jobId),
    });

    if (!job) throw new NotFoundException('Job not found');

    const sharesByChannelResult = await this.db
      .select({
        channel: jobShares.shareChannel,
        count: sql<number>`count(*)`,
      })
      .from(jobShares)
      .where(eq(jobShares.jobId, jobId))
      .groupBy(jobShares.shareChannel);

    const sharesByChannel: Record<string, number> = {};
    sharesByChannelResult.forEach(r => {
      sharesByChannel[r.channel] = Number(r.count);
    });

    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(jobShares)
      .where(eq(jobShares.jobId, jobId));

    return {
      totalShares: Number(totalResult[0]?.count || 0),
      sharesByChannel,
    };
  }
}
