import { Injectable, Inject, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { Database, jobs, jobViews, jobShares, employers, companies } from '@ai-job-portal/database';
import { hasCompanyPermission } from '@ai-job-portal/common';
import { DATABASE_CLIENT } from '../database/database.module';
import { TrackShareDto, AnalyticsQueryDto } from './dto';

@Injectable()
export class JobAnalyticsService {
  private readonly logger = new Logger(JobAnalyticsService.name);
  private readonly frontendUrl: string;

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly configService: ConfigService,
  ) {
    const url = this.configService.get('FRONTEND_URL');
    if (!url) {
      this.logger.warn(
        'FRONTEND_URL is not set. Share links will be broken. Set FRONTEND_URL in environment.',
      );
    }
    this.frontendUrl = url || '';
  }

  private async verifyJobOwnership(userId: string, jobId: string, userRole?: string) {
    const job = await this.db.query.jobs.findFirst({
      where: eq(jobs.id, jobId),
    });

    if (!job) throw new NotFoundException('Job not found');

    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.id, job.employerId),
    });

    if (!employer) throw new ForbiddenException('Not authorized');

    // Direct owner — always allowed
    if (employer.userId === userId) return job;

    // Company-level access for super_employer / employers with company-jobs:read
    if (userRole && employer.companyId) {
      const currentEmployer = await this.db.query.employers.findFirst({
        where: eq(employers.userId, userId),
      });

      if (currentEmployer?.companyId === employer.companyId) {
        const allowed = await hasCompanyPermission(
          this.db,
          currentEmployer.rbacRoleId,
          userRole,
          'company-jobs:read',
        );
        if (allowed) return job;
      }
    }

    throw new ForbiddenException('Not authorized');
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
    const text = companyName
      ? `Check out this job: ${jobTitle} at ${companyName}`
      : `Check out this job: ${jobTitle}`;
    const encodedUrl = encodeURIComponent(jobUrl);
    const encodedText = encodeURIComponent(text);

    const subject = companyName
      ? `Job Opportunity: ${jobTitle} at ${companyName}`
      : `Job Opportunity: ${jobTitle}`;

    return {
      jobUrl,
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      email: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodedText}%0A%0A${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    };
  }

  async trackShare(jobId: string, userId: string | null, dto: TrackShareDto) {
    return this.db.transaction(async (tx) => {
      const result = await tx
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

      // Only track if shareChannel is provided
      if (dto.shareChannel) {
        await tx.insert(jobShares).values({
          jobId,
          userId,
          shareChannel: dto.shareChannel,
        });
      }

      const jobUrl = `${this.frontendUrl}/jobs/${jobId}`;
      const shareLinks = this.buildShareLinks(jobUrl, job.title, job.companyName || '');

      return { shareLinks };
    });
  }

  async getJobAnalytics(
    userId: string,
    jobId: string,
    query: AnalyticsQueryDto,
    userRole?: string,
  ) {
    const job = await this.verifyJobOwnership(userId, jobId, userRole);

    // Build date conditions for views
    const viewConditions = [eq(jobViews.jobId, jobId)];
    if (query.startDate) {
      viewConditions.push(gte(jobViews.viewedAt, new Date(query.startDate)));
    }
    if (query.endDate) {
      const endDate = new Date(query.endDate);
      endDate.setHours(23, 59, 59, 999);
      viewConditions.push(lte(jobViews.viewedAt, endDate));
    }
    const viewWhere = and(...viewConditions);

    // Build date conditions for shares
    const shareConditions = [eq(jobShares.jobId, jobId)];
    if (query.startDate) {
      shareConditions.push(gte(jobShares.sharedAt, new Date(query.startDate)));
    }
    if (query.endDate) {
      const endDate = new Date(query.endDate);
      endDate.setHours(23, 59, 59, 999);
      shareConditions.push(lte(jobShares.sharedAt, endDate));
    }
    const shareWhere = and(...shareConditions);

    const [totalViewsResult, uniqueViewsResult, totalSharesResult, sharesByChannelResult] =
      await Promise.all([
        this.db
          .select({ count: sql<number>`count(*)` })
          .from(jobViews)
          .where(viewWhere),
        this.db
          .select({ count: sql<number>`count(distinct ${jobViews.userId})` })
          .from(jobViews)
          .where(viewWhere),
        this.db
          .select({ count: sql<number>`count(*)` })
          .from(jobShares)
          .where(shareWhere),
        this.db
          .select({
            channel: jobShares.shareChannel,
            count: sql<number>`count(*)`,
          })
          .from(jobShares)
          .where(shareWhere)
          .groupBy(jobShares.shareChannel),
      ]);

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

  async getShareStats(userId: string, jobId: string, userRole?: string) {
    await this.verifyJobOwnership(userId, jobId, userRole);

    const [sharesByChannelResult, totalResult] = await Promise.all([
      this.db
        .select({
          channel: jobShares.shareChannel,
          count: sql<number>`count(*)`,
        })
        .from(jobShares)
        .where(eq(jobShares.jobId, jobId))
        .groupBy(jobShares.shareChannel),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(jobShares)
        .where(eq(jobShares.jobId, jobId)),
    ]);

    const sharesByChannel: Record<string, number> = {};
    sharesByChannelResult.forEach((r) => {
      sharesByChannel[r.channel] = Number(r.count);
    });

    return {
      totalShares: Number(totalResult[0]?.count || 0),
      sharesByChannel,
    };
  }
}
