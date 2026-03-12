import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  Database,
  jobRecommendations,
  jobs,
  savedJobs,
  jobApplications,
  recommendationLogs,
} from '@ai-job-portal/database';
import Redis from 'ioredis';
import { firstValueFrom } from 'rxjs';
import { DATABASE_CLIENT } from '../database/database.module';
import { REDIS_CLIENT } from '../redis/redis.module';
import { RecommendationQueryDto } from './dto';

interface AiRecommendation {
  job_id: string;
  score: number;
  reason: string;
  title: string;
  company: string;
  location: string;
  skills: string[];
}

interface AiRecommendResponse {
  count: number;
  recommendations: AiRecommendation[];
}

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private readonly CACHE_TTL = 3600; // 1 hour cache
  private readonly aiModelUrl: string;

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.aiModelUrl =
      this.configService.get<string>('AI_MODEL_URL') ||
      'http://ai-job-portal-dev-alb-1152570158.ap-south-1.elb.amazonaws.com/ai';
  }

  async getRecommendations(userId: string, query: RecommendationQueryDto) {
    const limit = query.limit || 10;
    const page = query.page || 1;

    // Check cache first
    const cacheKey = `rec:${userId}:${limit}:${page}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Call AI model for recommendations (AI model fetches candidate profile from DB using user_id)
    const aiRecommendations = await this.fetchAiRecommendations(userId);

    // Get full job details from DB for the recommended job IDs
    const jobIds = aiRecommendations.map((r) => r.job_id);

    let jobsWithRelations: any[] = [];
    if (jobIds.length > 0) {
      jobsWithRelations = await this.db.query.jobs.findMany({
        where: sql`${jobs.id} IN (${sql.join(
          jobIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
        with: {
          employer: true,
          company: { columns: { id: true, name: true, logoUrl: true } },
          category: true,
        },
      });
    }

    const jobMap = new Map(jobsWithRelations.map((j) => [j.id, j]));

    // Get saved and applied status for the user
    let savedJobsList: { jobId: string }[] = [];
    let appliedJobsList: { jobId: string; status: string | null; updatedAt: Date | null }[] = [];

    if (jobIds.length > 0) {
      [savedJobsList, appliedJobsList] = await Promise.all([
        this.db
          .select({ jobId: savedJobs.jobId })
          .from(savedJobs)
          .where(
            and(
              eq(savedJobs.jobSeekerId, userId),
              sql`${savedJobs.jobId} IN (${sql.join(
                jobIds.map((id) => sql`${id}`),
                sql`, `,
              )})`,
            ),
          ),
        this.db
          .select({
            jobId: jobApplications.jobId,
            status: jobApplications.status,
            updatedAt: jobApplications.updatedAt,
          })
          .from(jobApplications)
          .where(
            and(
              eq(jobApplications.jobSeekerId, userId),
              sql`${jobApplications.jobId} IN (${sql.join(
                jobIds.map((id) => sql`${id}`),
                sql`, `,
              )})`,
            ),
          ),
      ]);
    }

    const savedJobIds = new Set(savedJobsList.map((s) => s.jobId));
    const appliedJobsMap = new Map(appliedJobsList.map((a) => [a.jobId, a] as const));

    // Build enriched results maintaining AI model ordering
    const now = new Date();
    const enrichedJobs = aiRecommendations
      .map((rec) => {
        const job = jobMap.get(rec.job_id);
        if (!job) return null;

        const appInfo = appliedJobsMap.get(job.id);
        const isWithdrawn = appInfo?.status === 'withdrawn';

        let reapplyDaysLeft: number | null = null;
        if (isWithdrawn && appInfo?.updatedAt) {
          const withdrawnAt = new Date(appInfo.updatedAt);
          const reapplyDate = new Date(withdrawnAt);
          reapplyDate.setDate(reapplyDate.getDate() + 60);
          const daysLeft = Math.ceil(
            (reapplyDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );
          reapplyDaysLeft = daysLeft > 0 ? daysLeft : 0;
        }

        return {
          ...job,
          isSaved: savedJobIds.has(job.id),
          isApplied: appInfo ? !isWithdrawn : false,
          isWithdrawn,
          reapplyDaysLeft,
          recommendationScore: rec.score,
          recommendationReason: rec.reason,
        };
      })
      .filter(Boolean);

    const total = enrichedJobs.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedJobs = enrichedJobs.slice(offset, offset + limit);

    const result = {
      data: paginatedJobs,
      pagination: {
        totalJob: total,
        pageCount: totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
      },
    };

    // Cache results
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));

    return result;
  }

  private async fetchAiRecommendations(userId: string): Promise<AiRecommendation[]> {
    try {
      const payload = { user_id: userId, save_to_db: false };

      this.logger.log(`Calling AI model for user ${userId}: ${this.aiModelUrl}/recommend`);

      const response = await firstValueFrom(
        this.httpService.post<AiRecommendResponse>(`${this.aiModelUrl}/recommend`, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000, // 60 second timeout (AI model may take 15-35s)
        }),
      );

      this.logger.log(
        `AI model returned ${response.data.count} recommendations for user ${userId}`,
      );

      return response.data.recommendations || [];
    } catch (error) {
      this.logger.error(`AI model call failed for user ${userId}: ${error.message}`);
      // Fallback to DB-based recommendations if AI model is unavailable
      return this.getFallbackRecommendations(userId);
    }
  }

  private async getFallbackRecommendations(userId: string): Promise<AiRecommendation[]> {
    this.logger.warn(`Using fallback DB recommendations for user ${userId}`);

    const dbRecommendations = await this.db.query.jobRecommendations.findMany({
      where: eq(jobRecommendations.userId, userId),
      orderBy: [desc(jobRecommendations.score)],
      limit: 10,
    });

    return dbRecommendations.map((r) => ({
      job_id: r.jobId,
      score: r.score || 0,
      reason: r.reason || 'Recommended based on your profile',
      title: '',
      company: '',
      location: '',
      skills: [],
    }));
  }

  async refreshRecommendations(userId: string, _forceRefresh = false) {
    // Invalidate cache
    const keys = await this.redis.keys(`rec:${userId}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }

    return {
      success: true,
      message:
        'Recommendation cache cleared. Fresh recommendations will be fetched on next request.',
    };
  }

  async logRecommendationAction(
    userId: string,
    jobId: string,
    action: 'viewed' | 'applied' | 'saved' | 'ignored' | 'not_interested',
    positionInList?: number,
  ) {
    // Get the recommendation if exists
    const recommendation = await this.db.query.jobRecommendations.findFirst({
      where: and(eq(jobRecommendations.userId, userId), eq(jobRecommendations.jobId, jobId)),
    });

    // Log the action
    await this.db.insert(recommendationLogs).values({
      userId,
      jobId,
      matchScore: recommendation?.score?.toString() || '0',
      recommendationReason: recommendation?.reason,
      algorithmVersion: 'ai-model-v1',
      userAction: action,
      positionInList,
      actionedAt: new Date(),
    });

    return { success: true };
  }

  async getSimilarJobs(jobId: string, limit = 5) {
    // Get job details to find similar ones
    const job = await this.db.query.jobs.findFirst({
      where: eq(jobs.id, jobId),
    });

    if (!job) {
      return [];
    }

    if (!job.categoryId) {
      return [];
    }

    const similarJobs = await this.db.query.jobs.findMany({
      where: and(
        sql`${jobs.id} != ${jobId}`,
        eq(jobs.categoryId, job.categoryId),
        eq(jobs.isActive, true),
      ),
      limit,
    });

    return similarJobs;
  }
}
