import { Injectable, Inject } from '@nestjs/common';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import { Database, jobRecommendations, jobs, profiles, recommendationLogs } from '@ai-job-portal/database';
import Redis from 'ioredis';
import { DATABASE_CLIENT } from '../database/database.module';
import { REDIS_CLIENT } from '../redis/redis.module';
import { RecommendationQueryDto } from './dto';

@Injectable()
export class RecommendationService {
  private readonly CACHE_TTL = 3600; // 1 hour cache

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async getRecommendations(userId: string, query: RecommendationQueryDto) {
    const limit = query.limit || 10;
    const minScore = query.minScore || 0;

    // Check cache first
    const cacheKey = `rec:${userId}:${limit}:${minScore}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get recommendations from DB
    const conditions = [eq(jobRecommendations.userId, userId)];
    if (minScore > 0) {
      conditions.push(gte(jobRecommendations.score, minScore));
    }

    const recommendations = await this.db.query.jobRecommendations.findMany({
      where: and(...conditions),
      orderBy: [desc(jobRecommendations.score)],
      limit,
    });

    // Get job details for recommendations
    const jobIds = recommendations.map(r => r.jobId);
    const jobDetails = jobIds.length > 0
      ? await this.db.query.jobs.findMany({
          where: (jobs, { inArray }) => inArray(jobs.id, jobIds),
        })
      : [];

    const jobMap = new Map(jobDetails.map(j => [j.id, j]));

    const result = recommendations.map(r => ({
      id: r.id,
      jobId: r.jobId,
      score: r.score,
      reason: r.reason,
      job: jobMap.get(r.jobId) || null,
      createdAt: r.createdAt,
    }));

    // Cache results
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));

    return result;
  }

  async refreshRecommendations(userId: string, forceRefresh = false) {
    // Invalidate cache
    const keys = await this.redis.keys(`rec:${userId}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }

    // In a real implementation, this would trigger the ML pipeline
    // For now, we'll just return a message
    return {
      success: true,
      message: 'Recommendation refresh queued',
      note: 'New recommendations will be available shortly',
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
      where: and(
        eq(jobRecommendations.userId, userId),
        eq(jobRecommendations.jobId, jobId),
      ),
    });

    // Log the action
    await this.db.insert(recommendationLogs).values({
      userId,
      jobId,
      matchScore: recommendation?.score?.toString() || '0',
      recommendationReason: recommendation?.reason,
      algorithmVersion: 'v1.0.0',
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

    // Simple similarity: same category or similar title keywords
    // In production, this would use embeddings or ML-based similarity
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
