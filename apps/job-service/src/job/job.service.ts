import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and, desc, sql, gte, lte, or, ilike, notInArray } from 'drizzle-orm';
import Redis from 'ioredis';
import {
  Database,
  jobs,
  jobViews,
  savedJobs,
  employers,
  profiles,
  jobPreferences,
  jobApplications,
  savedSearches,
} from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { REDIS_CLIENT } from '../redis/redis.module';
import { CreateJobDto, UpdateJobDto } from './dto';
import { SearchJobsDto } from '../search/dto';

@Injectable()
export class JobService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async create(userId: string, dto: CreateJobDto) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    const [job] = await this.db
      .insert(jobs)
      .values({
        employerId: employer.id,
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description,
        jobType: dto.jobType || 'full_time',
        employmentType: dto.employmentType,
        workMode: dto.workMode as any,
        experienceLevel: dto.experienceLevel,
        experienceMin: dto.experienceMin,
        experienceMax: dto.experienceMax,
        salaryMin: dto.salaryMin,
        salaryMax: dto.salaryMax,
        showSalary: dto.showSalary ?? true,
        location: dto.location || '',
        city: dto.city,
        state: dto.state,
        country: dto.country,
        skills: dto.skills || [],
        benefits: dto.benefits,
        isActive: false, // Draft state
      } as any)
      .returning();

    return job;
  }

  async findById(id: string) {
    const job = await this.db.query.jobs.findFirst({
      where: eq(jobs.id, id),
      with: {
        employer: true,
        category: true,
        screeningQuestions: {
          orderBy: (q, { asc }) => [asc(q.order)],
        },
      },
    });
    if (!job) throw new NotFoundException('Job not found');

    // Return questions from screeningQuestions table (source of truth)
    // Ensure empty array instead of undefined/null
    return {
      ...job,
      questions: job.screeningQuestions || [],
    };
  }

  async update(userId: string, jobId: string, dto: UpdateJobDto) {
    const _job = await this.verifyOwnership(userId, jobId);

    const updateData: any = { ...dto, updatedAt: new Date() };
    await this.db.update(jobs).set(updateData).where(eq(jobs.id, jobId));

    // Invalidate cache
    await this.redis.del(`job:${jobId}`);

    return this.findById(jobId);
  }

  async publish(userId: string, jobId: string) {
    const job = await this.verifyOwnership(userId, jobId);

    if (job.isActive) {
      return { message: 'Job already published' };
    }

    await this.db
      .update(jobs)
      .set({
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId));

    return { message: 'Job published successfully' };
  }

  async close(userId: string, jobId: string) {
    const job = await this.verifyOwnership(userId, jobId);

    if (!job.isActive) {
      return { message: 'Job already closed' };
    }

    await this.db
      .update(jobs)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(jobs.id, jobId));

    return { message: 'Job closed' };
  }

  async delete(userId: string, jobId: string) {
    await this.verifyOwnership(userId, jobId);
    await this.db.delete(jobs).where(eq(jobs.id, jobId));
    return { message: 'Job deleted' };
  }

  async getEmployerJobs(userId: string, active?: boolean) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    const conditions = [eq(jobs.employerId, employer.id)];
    if (active !== undefined) conditions.push(eq(jobs.isActive, active));

    return this.db.query.jobs.findMany({
      where: and(...conditions),
      orderBy: [desc(jobs.createdAt)],
      with: { category: true },
    });
  }

  async recordView(jobId: string, userId?: string, ip?: string) {
    // Validate UUID format to prevent errors from routing mismatches
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(jobId)) {
      return; // Silently skip if not a valid UUID
    }

    if (userId) {
      await this.db.insert(jobViews).values({
        jobId,
        userId,
        ipAddress: ip,
      });
    }

    await this.db
      .update(jobs)
      .set({ viewCount: sql`${jobs.viewCount} + 1` })
      .where(eq(jobs.id, jobId));
  }

  async saveJob(userId: string, jobId: string) {
    const existing = await this.db.query.savedJobs.findFirst({
      where: and(eq(savedJobs.jobSeekerId, userId), eq(savedJobs.jobId, jobId)),
    });
    if (existing) return { message: 'Already saved' };

    await this.db.insert(savedJobs).values({ jobSeekerId: userId, jobId });
    return { message: 'Job saved' };
  }

  async unsaveJob(userId: string, jobId: string) {
    await this.db
      .delete(savedJobs)
      .where(and(eq(savedJobs.jobSeekerId, userId), eq(savedJobs.jobId, jobId)));
    return { message: 'Job unsaved' };
  }

  async getSavedJobs(userId: string) {
    return this.db.query.savedJobs.findMany({
      where: eq(savedJobs.jobSeekerId, userId),
      with: { job: { with: { employer: true } } },
    });
  }

  async getRecommendedJobs(userId: string, dto: SearchJobsDto) {
    // Fetch candidate profile
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });

    // Fetch job preferences if profile exists
    let preferences: any = null;
    if (profile) {
      preferences = await this.db.query.jobPreferences.findFirst({
        where: eq(jobPreferences.profileId, profile.id),
      });
    }

    // Fetch applied job IDs to exclude
    const appliedJobs = await this.db
      .select({ jobId: jobApplications.jobId })
      .from(jobApplications)
      .where(eq(jobApplications.jobSeekerId, userId));
    const appliedJobIds = appliedJobs.map((a) => a.jobId);

    // Fetch saved job IDs for boosting
    const savedJobsList = await this.db
      .select({ jobId: savedJobs.jobId })
      .from(savedJobs)
      .where(eq(savedJobs.jobSeekerId, userId));
    const savedJobIds = savedJobsList.map((s) => s.jobId);

    // Fetch saved searches for keyword matching
    const userSavedSearches = await this.db.query.savedSearches.findMany({
      where: and(eq(savedSearches.userId, userId), eq(savedSearches.isActive, true)),
      orderBy: (s, { desc }) => [desc(s.createdAt)],
      limit: 10, // Limit to recent saved searches
    });

    // Extract keywords from saved searches
    const savedSearchKeywords: string[] = [];
    for (const search of userSavedSearches) {
      try {
        const criteria = JSON.parse(search.searchCriteria || '{}');
        if (criteria.query) {
          savedSearchKeywords.push(criteria.query.toLowerCase());
        }
        if (criteria.keywords) {
          const keywords = Array.isArray(criteria.keywords)
            ? criteria.keywords
            : criteria.keywords.split(',');
          savedSearchKeywords.push(...keywords.map((k: string) => k.trim().toLowerCase()));
        }
        if (criteria.title) {
          savedSearchKeywords.push(criteria.title.toLowerCase());
        }
      } catch {
        // Skip invalid JSON
      }
    }
    // Remove duplicates
    const uniqueKeywords = [...new Set(savedSearchKeywords)].filter((k) => k.length > 2);

    // Build base conditions
    const conditions: any[] = [eq(jobs.isActive, true)];

    // Exclude expired jobs
    conditions.push(or(sql`${jobs.deadline} IS NULL`, gte(jobs.deadline, new Date())));

    // Exclude already applied jobs
    if (appliedJobIds.length > 0) {
      conditions.push(notInArray(jobs.id, appliedJobIds));
    }

    // Apply optional filters from query params (same as searchJobs)
    if (dto.query) {
      conditions.push(
        or(ilike(jobs.title, `%${dto.query}%`), ilike(jobs.description, `%${dto.query}%`)),
      );
    }

    if (dto.categoryId) {
      conditions.push(eq(jobs.categoryId, dto.categoryId));
    }

    if (dto.employmentTypes?.length) {
      conditions.push(or(...dto.employmentTypes.map((t) => eq(jobs.employmentType, t as any))));
    }

    if (dto.workModes?.length) {
      conditions.push(
        sql`${jobs.workMode} && ARRAY[${sql.join(
          dto.workModes.map((m) => sql`${m}`),
          sql`, `,
        )}]::text[]`,
      );
    }

    if (dto.experienceLevels?.length) {
      conditions.push(or(...dto.experienceLevels.map((l) => eq(jobs.experienceLevel, l as any))));
    }

    if (dto.salaryMin) {
      conditions.push(gte(jobs.salaryMax, dto.salaryMin));
    }

    if (dto.salaryMax) {
      conditions.push(lte(jobs.salaryMin, dto.salaryMax));
    }

    if (dto.location) {
      conditions.push(
        or(
          ilike(jobs.city, `%${dto.location}%`),
          ilike(jobs.state, `%${dto.location}%`),
          ilike(jobs.country, `%${dto.location}%`),
          ilike(jobs.location, `%${dto.location}%`),
        ),
      );
    }

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const offset = (page - 1) * limit;

    // Build recommendation scoring using SQL CASE statements
    // Score components:
    // - Job preference match (location, employment type): 40 points
    // - Saved job similarity (same category): 25 points
    // - Engagement boost (application_count, view_count): 20 points
    // - Recency boost: 15 points

    // Parse preferences for location and job type matching
    const preferredLocations = preferences?.preferredLocations
      ? preferences.preferredLocations.split(',').map((l: string) => l.trim().toLowerCase())
      : [];
    const preferredJobTypes = preferences?.jobTypes
      ? preferences.jobTypes.split(',').map((t: string) => t.trim().toLowerCase())
      : [];

    // Get categories from saved jobs for similarity matching
    let savedJobCategories: string[] = [];
    if (savedJobIds.length > 0) {
      const savedJobsData = await this.db
        .select({ categoryId: jobs.categoryId })
        .from(jobs)
        .where(
          sql`${jobs.id} IN (${sql.join(
            savedJobIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        );
      savedJobCategories = savedJobsData
        .filter((j) => j.categoryId)
        .map((j) => j.categoryId as string);
    }

    // Build location preference SQL condition
    const locationScoreSql =
      preferredLocations.length > 0
        ? sql`CASE WHEN ${or(
            ...preferredLocations.map((loc: string) =>
              or(
                sql`LOWER(${jobs.city}) LIKE ${`%${loc}%`}`,
                sql`LOWER(${jobs.state}) LIKE ${`%${loc}%`}`,
                sql`LOWER(${jobs.country}) LIKE ${`%${loc}%`}`,
              ),
            ),
          )} THEN 20 ELSE 0 END`
        : sql`0`;

    // Build job type preference SQL condition
    const jobTypeScoreSql =
      preferredJobTypes.length > 0
        ? sql`CASE WHEN LOWER(${jobs.employmentType}) IN (${sql.join(
            preferredJobTypes.map((t: string) => sql`${t}`),
            sql`, `,
          )}) THEN 20 ELSE 0 END`
        : sql`0`;

    // Build category similarity SQL condition (from saved jobs)
    const categoryScoreSql =
      savedJobCategories.length > 0
        ? sql`CASE WHEN ${jobs.categoryId} IN (${sql.join(
            savedJobCategories.map((c) => sql`${c}`),
            sql`, `,
          )}) THEN 25 ELSE 0 END`
        : sql`0`;

    // Build saved search keyword matching SQL condition
    const keywordScoreSql =
      uniqueKeywords.length > 0
        ? sql`CASE WHEN ${or(
            ...uniqueKeywords.map((keyword: string) =>
              or(
                sql`LOWER(${jobs.title}) LIKE ${`%${keyword}%`}`,
                sql`LOWER(${jobs.description}) LIKE ${`%${keyword}%`}`,
                sql`${keyword} = ANY(SELECT LOWER(unnest(${jobs.skills})))`,
              ),
            ),
          )} THEN 15 ELSE 0 END`
        : sql`0`;

    // Build saved job boost (jobs the user saved get a small boost)
    const savedBoostSql =
      savedJobIds.length > 0
        ? sql`CASE WHEN ${jobs.id} IN (${sql.join(
            savedJobIds.map((id) => sql`${id}`),
            sql`, `,
          )}) THEN 10 ELSE 0 END`
        : sql`0`;

    // Engagement score (normalized)
    const engagementScoreSql = sql`(
      LEAST(COALESCE(${jobs.applicationCount}, 0), 100) * 0.15 +
      LEAST(COALESCE(${jobs.viewCount}, 0) / 10, 50) * 0.05
    )`;

    // Recency score (jobs posted in last 7 days get boost)
    const recencyScoreSql = sql`CASE
      WHEN ${jobs.createdAt} >= NOW() - INTERVAL '7 days' THEN 15
      WHEN ${jobs.createdAt} >= NOW() - INTERVAL '14 days' THEN 10
      WHEN ${jobs.createdAt} >= NOW() - INTERVAL '30 days' THEN 5
      ELSE 0
    END`;

    // Combined recommendation score
    const recommendationScoreSql = sql`(
      ${locationScoreSql} +
      ${jobTypeScoreSql} +
      ${categoryScoreSql} +
      ${keywordScoreSql} +
      ${savedBoostSql} +
      ${engagementScoreSql} +
      ${recencyScoreSql}
    )`;

    // Get recommended jobs ordered by score
    const results = await this.db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(sql`${recommendationScoreSql} DESC`, desc(jobs.createdAt))
      .limit(limit)
      .offset(offset);

    // Fetch related data for results
    const jobIds = results.map((j) => j.id);
    let jobsWithRelations: any[] = [];

    if (jobIds.length > 0) {
      jobsWithRelations = await this.db.query.jobs.findMany({
        where: sql`${jobs.id} IN (${sql.join(
          jobIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
        with: { employer: true, category: true },
      });

      // Maintain recommendation order from original query
      const jobMap = new Map(jobsWithRelations.map((j) => [j.id, j]));
      jobsWithRelations = jobIds.map((id) => jobMap.get(id)).filter(Boolean);

      // Add isSaved and isApplied flags
      jobsWithRelations = jobsWithRelations.map((job) => ({
        ...job,
        isSaved: savedJobIds.includes(job.id),
        isApplied: appliedJobIds.includes(job.id),
      }));
    }

    // Get total count for pagination
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count || 0);

    const totalPages = Math.ceil(total / limit);
    return {
      data: jobsWithRelations,
      pagination: {
        totalJob: total,
        pageCount: totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
      },
    };
  }

  private async verifyOwnership(userId: string, jobId: string) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    const job = await this.db.query.jobs.findFirst({
      where: and(eq(jobs.id, jobId), eq(jobs.employerId, employer.id)),
    });
    if (!job) throw new NotFoundException('Job not found or access denied');

    return job;
  }
}
