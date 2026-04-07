import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { eq, and, desc, sql, or, gte, lte, ilike, notInArray, inArray } from 'drizzle-orm';
import {
  Database,
  jobRecommendations,
  jobs,
  savedJobs,
  jobApplications,
  recommendationLogs,
  profiles,
  profileSkills,
  skills,
  jobPreferences,
  savedSearches,
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
  private readonly AI_TIMEOUT = 60000; // 60 seconds timeout for AI model
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

    // Prepare SQL fallback in parallel
    const sqlFallbackPromise = this.getSqlFallbackRecommendations(userId, query);

    // Call AI model with timeout
    const startTime = Date.now();
    const aiPromise = this.fetchAiRecommendations(userId, query);
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => {
        const timeoutDuration = Date.now() - startTime;
        this.logger.warn(
          `⏱️ AI model TIMED OUT after ${timeoutDuration}ms for user ${userId} (Limit: ${this.AI_TIMEOUT}ms)`,
        );
        resolve(null);
      }, this.AI_TIMEOUT),
    );

    const aiRecommendations = await Promise.race([aiPromise, timeoutPromise]);
    const duration = Date.now() - startTime;

    let result;
    if (aiRecommendations && aiRecommendations.length > 0) {
      // AI Success - process and enrich AI results
      result = await this.enrichAiRecommendations(userId, aiRecommendations, limit, page);
      this.logger.log(
        `✅ SUCCESS: Using AI-powered results for user ${userId} (Took ${duration}ms)`,
      );
    } else {
      // AI Failed/Timed out/Empty - use SQL fallback
      result = await sqlFallbackPromise;
      this.logger.log(
        `⚠️ FALLBACK: Using SQL-based results for user ${userId} (AI failed/timed out after ${duration}ms)`,
      );
    }

    // Cache results
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));
    return result;
  }

  private async enrichAiRecommendations(
    userId: string,
    aiRecommendations: AiRecommendation[],
    limit: number,
    page: number,
  ) {
    const jobIds = aiRecommendations.map((r) => r.job_id).filter((id) => id);
    if (jobIds.length === 0) {
      return {
        data: [],
        pagination: { totalJob: 0, pageCount: 0, currentPage: page, hasNextPage: false },
        source: 'ai',
      };
    }

    // Get candidate's applied/withdrawn job IDs to exclude
    const appliedJobsList = await this.db
      .select({
        jobId: jobApplications.jobId,
        status: jobApplications.status,
      })
      .from(jobApplications)
      .where(and(eq(jobApplications.jobSeekerId, userId), inArray(jobApplications.jobId, jobIds)));

    // Exclude jobs where candidate has applied (not withdrawn) or withdrawn
    const excludeJobIds = new Set(appliedJobsList.map((a) => a.jobId));

    // Filter AI job IDs: remove applied/withdrawn jobs before DB query
    const validJobIds = jobIds.filter((id) => !excludeJobIds.has(id));

    // Fetch only active jobs with valid status and deadline from DB
    let jobsWithRelations: any[] = [];
    if (validJobIds.length > 0) {
      jobsWithRelations = await this.db.query.jobs.findMany({
        where: and(
          inArray(jobs.id, validJobIds),
          eq(jobs.isActive, true),
          eq(jobs.status, 'active'),
          or(sql`${jobs.deadline} IS NULL`, gte(jobs.deadline, new Date())),
        ),
        with: {
          employer: true,
          company: { columns: { id: true, name: true, logoUrl: true } },
          category: true,
        },
      });
    }

    const jobMap = new Map(jobsWithRelations.map((j) => [j.id, j]));

    // Get saved status for the valid jobs
    const activeJobIds = jobsWithRelations.map((j) => j.id);
    let savedJobIds = new Set<string>();
    if (activeJobIds.length > 0) {
      const savedJobsList = await this.db
        .select({ jobId: savedJobs.jobId })
        .from(savedJobs)
        .where(and(eq(savedJobs.jobSeekerId, userId), inArray(savedJobs.jobId, activeJobIds)));
      savedJobIds = new Set(savedJobsList.map((s) => s.jobId));
    }

    // Build enriched results preserving AI ordering
    const enrichedJobs = aiRecommendations
      .map((rec) => {
        const job = jobMap.get(rec.job_id);
        if (!job) return null; // Filtered out (applied/withdrawn/inactive/expired)

        return {
          ...job,
          isSaved: savedJobIds.has(job.id),
          isApplied: false,
          isWithdrawn: false,
          reapplyDaysLeft: null,
          recommendationScore: rec.score,
          recommendationReason: rec.reason,
        };
      })
      .filter(Boolean);

    const total = enrichedJobs.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    return {
      data: enrichedJobs.slice(offset, offset + limit),
      pagination: {
        totalJob: total,
        pageCount: totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
      },
      source: 'ai',
    };
  }

  private async getSqlFallbackRecommendations(userId: string, query: RecommendationQueryDto) {
    // Ported from JobService.getRecommendedJobs
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });

    let preferences: any = null;
    if (profile) {
      preferences = await this.db.query.jobPreferences.findFirst({
        where: eq(jobPreferences.profileId, profile.id),
      });
    }

    const appliedJobs = await this.db
      .select({
        jobId: jobApplications.jobId,
        status: jobApplications.status,
        updatedAt: jobApplications.updatedAt,
      })
      .from(jobApplications)
      .where(eq(jobApplications.jobSeekerId, userId));

    // Exclude all jobs the candidate has interacted with (applied or withdrawn)
    const appliedJobIds = appliedJobs.map((a) => a.jobId);

    const savedJobsList = await this.db
      .select({ jobId: savedJobs.jobId })
      .from(savedJobs)
      .where(eq(savedJobs.jobSeekerId, userId));
    const savedJobIds = savedJobsList.map((s) => s.jobId);

    const userSavedSearches = await this.db.query.savedSearches.findMany({
      where: and(eq(savedSearches.userId, userId), eq(savedSearches.isActive, true)),
      orderBy: (s, { desc }) => [desc(s.createdAt)],
      limit: 10,
    });

    const uniqueKeywords: string[] = [];
    userSavedSearches.forEach((search) => {
      try {
        const criteria = JSON.parse(search.searchCriteria || '{}');
        const kws = [criteria.query, criteria.title, ...(criteria.keywords || [])];
        kws.forEach((k) => {
          if (typeof k === 'string' && k.length > 2) uniqueKeywords.push(k.toLowerCase());
        });
      } catch (e) {
        this.logger.log(`Error parsing search criteria: ${e}`);
      }
    });

    // Strategy: Same SQL-based scoring as JobService
    const conditions: any[] = [eq(jobs.isActive, true), eq(jobs.status, 'active')];
    conditions.push(or(sql`${jobs.deadline} IS NULL`, gte(jobs.deadline, new Date())));
    if (appliedJobIds.length > 0) conditions.push(notInArray(jobs.id, appliedJobIds));

    // Apply Query Filters
    if (query.query)
      conditions.push(
        or(ilike(jobs.title, `%${query.query}%`), ilike(jobs.description, `%${query.query}%`)),
      );
    if (query.categoryId) conditions.push(eq(jobs.categoryId, query.categoryId));
    if (query.workModes?.length)
      conditions.push(
        sql`${jobs.workMode} && ARRAY[${sql.join(
          query.workModes.map((m) => sql`${m}`),
          sql`, `,
        )}]::text[]`,
      );
    if (query.experienceLevels?.length)
      conditions.push(or(...query.experienceLevels.map((l) => eq(jobs.experienceLevel, l as any))));
    if (query.salaryMin) conditions.push(gte(jobs.salaryMax, query.salaryMin));
    if (query.salaryMax) conditions.push(lte(jobs.salaryMin, query.salaryMax));
    if (query.location)
      conditions.push(
        or(ilike(jobs.city, `%${query.location}%`), ilike(jobs.state, `%${query.location}%`)),
      );

    // Scoring SQL
    const preferredLocations =
      preferences?.preferredLocations?.split(',').map((l: string) => l.trim().toLowerCase()) || [];
    const locationScoreSql =
      preferredLocations.length > 0
        ? sql`CASE WHEN ${or(...preferredLocations.map((loc: string) => or(sql`LOWER(${jobs.city}) LIKE ${`%${loc}%`}`, sql`LOWER(${jobs.state}) LIKE ${`%${loc}%`}`)))} THEN 20 ELSE 0 END`
        : sql`0`;
    const recencyScoreSql = sql`CASE WHEN ${jobs.createdAt} >= NOW() - INTERVAL '7 days' THEN 15 WHEN ${jobs.createdAt} >= NOW() - INTERVAL '30 days' THEN 5 ELSE 0 END`;

    const recommendationScoreSql = sql`(${locationScoreSql} + ${recencyScoreSql})`;

    const limit = query.limit || 10;
    const page = query.page || 1;
    const offset = (page - 1) * limit;

    const results = await this.db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(sql`${recommendationScoreSql} DESC`, desc(jobs.createdAt))
      .limit(limit)
      .offset(offset);

    const jobIds = results.map((j) => j.id);
    let jobsWithRelations: any[] = [];
    if (jobIds.length > 0) {
      jobsWithRelations = await this.db.query.jobs.findMany({
        where: inArray(jobs.id, jobIds),
        with: {
          employer: true,
          company: { columns: { id: true, name: true, logoUrl: true } },
          category: true,
        },
      });
      const jobMap = new Map(jobsWithRelations.map((j) => [j.id, j]));
      jobsWithRelations = jobIds
        .map((id) => {
          const job = jobMap.get(id);
          if (!job) return null;
          return {
            ...job,
            isSaved: savedJobIds.includes(job.id),
            isApplied: false,
            isWithdrawn: false,
            reapplyDaysLeft: null,
            recommendationScore: 0, // Fallback score
            recommendationReason: 'Based on your profile and location preferences',
          };
        })
        .filter(Boolean);
    }

    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(and(...conditions));
    const total = Number(countResult[0]?.count || 0);

    return {
      data: jobsWithRelations,
      pagination: {
        totalJob: total,
        pageCount: Math.ceil(total / limit),
        currentPage: page,
        hasNextPage: page < Math.ceil(total / limit),
      },
      source: 'fallback',
    };
  }

  private async fetchAiRecommendations(
    userId: string,
    query: RecommendationQueryDto,
  ): Promise<AiRecommendation[]> {
    try {
      // Use query filters to guide AI if needed (optional)
      const payload: Record<string, any> = { user_id: userId, save_to_db: false, ...query };

      try {
        const [profile, candidateSkills] = await Promise.all([
          this.db.query.profiles.findFirst({
            where: eq(profiles.userId, userId),
            columns: {
              id: true,
              city: true,
              state: true,
              country: true,
              totalExperienceYears: true,
            },
          }),
          this.db
            .select({ name: skills.name })
            .from(profileSkills)
            .innerJoin(skills, eq(profileSkills.skillId, skills.id))
            .innerJoin(profiles, eq(profileSkills.profileId, profiles.id))
            .where(eq(profiles.userId, userId)),
        ]);

        if (profile) {
          // Prefer preferredLocations from jobPreferences, fallback to profile address
          const preferences = await this.db.query.jobPreferences.findFirst({
            where: eq(jobPreferences.profileId, profile.id),
            columns: { preferredLocations: true },
          });

          const preferredLocations = preferences?.preferredLocations?.trim();
          if (preferredLocations) {
            payload.location = preferredLocations;
          } else {
            const locationParts = [profile.city, profile.state, profile.country].filter(Boolean);
            if (locationParts.length > 0) {
              payload.location = locationParts.join(', ');
            }
          }

          if (profile.totalExperienceYears != null) {
            payload.experience_years = parseFloat(String(profile.totalExperienceYears));
          }
        }

        if (candidateSkills.length > 0) {
          payload.skills = candidateSkills.map((s) => s.name);
        }
      } catch (profileError) {
        this.logger.warn(
          `Could not fetch profile data for user ${userId}: ${profileError.message}. Proceeding with user_id only.`,
        );
      }

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

  async invalidateUserCache(userId: string) {
    try {
      const keys = await this.redis.keys(`rec:${userId}:*`);
      if (keys.length === 0) return { success: true };

      await this.redis.del(...keys);
      this.logger.log(`Invalidated recommendation cache for user ${userId} (${keys.length} keys)`);

      return { success: true };
    } catch (err) {
      this.logger.error(`Failed to invalidate cache for user ${userId}: ${err.message}`);
      return { success: false };
    }
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
