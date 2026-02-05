import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, sql, gte, lte, or, ilike, notInArray, InferSelectModel } from 'drizzle-orm';
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
  jobCategories,
} from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { REDIS_CLIENT } from '../redis/redis.module';
import { CreateJobDto, UpdateJobDto, OTHER_CATEGORY_VALUE } from './dto';
import { SearchJobsDto } from '../search/dto';

type EmployerJob = InferSelectModel<typeof jobs> & {
  company: { id: string; name: string } | null;
  category: InferSelectModel<typeof jobCategories> | null;
  subCategory: InferSelectModel<typeof jobCategories> | null;
};

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

    // Validate category hierarchy
    await this.validateCategoryHierarchy(dto);

    // Convert "other" values to null for database storage
    const categoryId = dto.categoryId === OTHER_CATEGORY_VALUE ? null : dto.categoryId;
    const subCategoryId = dto.subCategoryId === OTHER_CATEGORY_VALUE ? null : dto.subCategoryId;

    const [job] = await this.db
      .insert(jobs)
      .values({
        employerId: employer.id,
        companyId: employer.companyId,
        categoryId: categoryId,
        subCategoryId: subCategoryId,
        customCategory: dto.customCategory,
        customSubCategory: dto.customSubCategory,
        title: dto.title,
        description: dto.description,
        jobType: dto.jobType as any,
        workMode: dto.workMode as any,
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
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        immigrationStatus: dto.immigrationStatus,
        payRate: dto.payRate,
        travelRequirements: dto.travelRequirements,
        qualification: dto.qualification,
        certification: dto.certification,
        isActive: true,
      } as any)
      .returning();

    return job;
  }

  /**
   * Validates the category hierarchy:
   * 1. categoryId must be a parent category (parentId = null) if provided
   * 2. subCategoryId must belong to the selected categoryId if provided
   * 3. customCategory required if categoryId = "other"
   * 4. customSubCategory required if subCategoryId = "other"
   */
  private async validateCategoryHierarchy(dto: CreateJobDto): Promise<void> {
    // Case 1: "Other" category selected - customCategory required
    if (dto.categoryId === OTHER_CATEGORY_VALUE) {
      if (!dto.customCategory?.trim()) {
        throw new BadRequestException('Custom category name is required when selecting "Other"');
      }
      // subCategoryId and customSubCategory are optional with "Other" category
      return;
    }

    // Case 2: Standard category selected
    if (dto.categoryId) {
      const category = await this.db.query.jobCategories.findFirst({
        where: eq(jobCategories.id, dto.categoryId),
      });

      if (!category) {
        throw new BadRequestException('Category not found');
      }

      // Verify it's a parent category (parentId must be null)
      if (category.parentId !== null) {
        throw new BadRequestException(
          'Selected category must be a parent category (not a subcategory)',
        );
      }

      // Case 3: Validate subcategory if provided
      if (dto.subCategoryId && dto.subCategoryId !== OTHER_CATEGORY_VALUE) {
        const subCategory = await this.db.query.jobCategories.findFirst({
          where: eq(jobCategories.id, dto.subCategoryId),
        });

        if (!subCategory) {
          throw new BadRequestException('Subcategory not found');
        }

        // Verify subcategory belongs to selected category
        if (subCategory.parentId !== dto.categoryId) {
          throw new BadRequestException('Subcategory does not belong to the selected category');
        }
      }

      // Case 4: "Other" subcategory - customSubCategory required
      if (dto.subCategoryId === OTHER_CATEGORY_VALUE && !dto.customSubCategory?.trim()) {
        throw new BadRequestException('Custom subcategory name is required when selecting "Other"');
      }
    }

    // Case 5: No category but subcategory provided - invalid
    if (!dto.categoryId && (dto.subCategoryId || dto.customSubCategory)) {
      throw new BadRequestException('Cannot specify subcategory without a parent category');
    }
  }

  async findById(id: string) {
    const job = await this.db.query.jobs.findFirst({
      where: eq(jobs.id, id),
      with: {
        employer: true,
        company: {
          columns: { id: true, name: true },
        },
        category: true,
        subCategory: true,
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

    // Convert deadline string to Date if provided
    if (dto.deadline !== undefined) {
      updateData.deadline = dto.deadline ? new Date(dto.deadline) : null;
    }

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

  async getEmployerJobs(userId: string, active?: boolean): Promise<EmployerJob[]> {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    const conditions = [eq(jobs.employerId, employer.id)];
    if (active !== undefined) conditions.push(eq(jobs.isActive, active));

    return this.db.query.jobs.findMany({
      where: and(...conditions),
      orderBy: [desc(jobs.createdAt)],
      with: { company: { columns: { id: true, name: true } }, category: true, subCategory: true },
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

    // Build job type preference SQL condition (jobType is now an array)
    const jobTypeScoreSql =
      preferredJobTypes.length > 0
        ? sql`CASE WHEN ${jobs.jobType} && ARRAY[${sql.join(
            preferredJobTypes.map((t: string) => sql`${t}`),
            sql`, `,
          )}]::text[] THEN 20 ELSE 0 END`
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
        with: { employer: true, company: { columns: { id: true, name: true } }, category: true },
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
