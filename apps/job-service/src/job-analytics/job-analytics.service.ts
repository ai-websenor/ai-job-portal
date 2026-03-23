import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, sql } from 'drizzle-orm';
import { Database, jobs, jobViews, jobShares, employers, companies } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { TrackShareDto, AnalyticsQueryDto } from './dto';

@Injectable()
export class JobAnalyticsService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly configService: ConfigService,
  ) {}

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
    await this.db
      .update(jobs)
      .set({ viewCount: sql`${jobs.viewCount} + 1` })
      .where(eq(jobs.id, jobId));

    return { success: true };
  }

  private buildShareLinks(jobUrl: string, jobTitle: string, companyName: string) {
    const text = `Check out this job: ${jobTitle} at ${companyName}`;
    const encodedUrl = encodeURIComponent(jobUrl);
    const encodedText = encodeURIComponent(text);

    return {
      jobUrl,
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      email: `mailto:?subject=${encodeURIComponent(`Job Opportunity: ${jobTitle} at ${companyName}`)}&body=${encodedText}%0A%0A${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    };
  }

  async trackShare(jobId: string, userId: string | null, dto: TrackShareDto) {
    const result = await this.db
      .select({
        title: jobs.title,
        companyName: companies.name,
      })
      .from(jobs)
      .leftJoin(companies, eq(jobs.companyId, companies.id))
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!result.length) throw new NotFoundException('Job not found');

    const job = result[0];

    await this.db.insert(jobShares).values({
      jobId,
      userId,
      shareChannel: dto.shareChannel,
    });

    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const jobUrl = `${frontendUrl}/jobs/${jobId}`;
    const shareLinks = this.buildShareLinks(jobUrl, job.title, job.companyName || '');

    return {
      shareLinks,
    };
  }

  async getJobAnalytics(userId: string, jobId: string, _query: AnalyticsQueryDto) {
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
    sharesByChannelResult.forEach((r) => {
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
    sharesByChannelResult.forEach((r) => {
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
