import { BadRequestException, Injectable, Inject, Logger } from '@nestjs/common';
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
  educationRecords,
  workExperiences,
  jobCategories,
} from '@ai-job-portal/database';
import Redis from 'ioredis';

import { firstValueFrom } from 'rxjs';
import { DATABASE_CLIENT } from '../database/database.module';
import { REDIS_CLIENT } from '../redis/redis.module';
import {
  CANDIDATE_JOB_GROUP_IDS,
  CandidateJobGroupId,
  CandidateJobGroupJobsQueryDto,
  RecommendationQueryDto,
} from './dto';

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

const CANDIDATE_JOB_GROUPS: { id: CandidateJobGroupId; name: string }[] = [
  { id: 'hybrid', name: 'Hybrid Jobs' },
  { id: 'remote', name: 'Remote Jobs' },
  { id: 'entry_level', name: 'Entry-Level Jobs' },
  { id: 'experienced', name: 'Experienced-Level Jobs' },
  { id: 'high_paid', name: 'High-Paid Jobs' },
  { id: 'most_applied', name: 'Most Applied Jobs' },
];

const VALID_JOB_TYPE_PREFERENCES = new Set([
  'full_time',
  'part_time',
  'contract',
  'internship',
  'freelance',
  'gig',
]);

interface CandidateJobMatchContext {
  profile: any | null;
  preferences: any | null;
  skillNames: string[];
  educationKeywords: string[];
  preferenceKeywords: string[];
  workKeywords: string[];
  experienceYears: number;
  preferredCategoryIds: string[];
  appliedJobIds: string[];
  savedJobIds: string[];
}

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
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

    // Step 1: Check DB for stored AI recommendations
    const storedRecs = await this.db.query.jobRecommendations.findMany({
      where: eq(jobRecommendations.userId, userId),
      orderBy: [desc(jobRecommendations.score)],
    });

    if (storedRecs.length > 0) {
      // Use stored recommendations — filter applied/saved/inactive at read time
      const aiRecs: AiRecommendation[] = storedRecs.map((r) => ({
        job_id: r.jobId,
        score: r.score || 0,
        reason: r.reason || 'Recommended based on your profile',
        title: '',
        company: '',
        location: '',
        skills: [],
      }));
      const result = await this.enrichAiRecommendations(userId, aiRecs, limit, page);
      result.source = 'ai';
      this.logger.log(
        `Using ${storedRecs.length} stored AI recommendations for user ${userId} (${result.data.length} after filtering)`,
      );
      return result;
    }

    // Step 2: No stored recs — call AI model, store results, return
    this.logger.log(`No stored recommendations for user ${userId}, calling AI model...`);
    const result = await this.fetchAndStoreRecommendations(userId, query);

    if (result) {
      return result;
    }

    // Step 3: AI failed — use SQL fallback
    this.logger.log(`AI model failed for user ${userId}, using SQL fallback`);
    return this.getSqlFallbackRecommendations(userId, query);
  }

  /**
   * Calls AI model, stores results in DB, and returns enriched recommendations.
   * Used on first request (no stored recs) and on profile change triggers.
   */
  async fetchAndStoreRecommendations(userId: string, query: RecommendationQueryDto) {
    const limit = query.limit || 10;
    const page = query.page || 1;

    const startTime = Date.now();
    const aiPromise = this.fetchAiRecommendations(userId, query);
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => {
        this.logger.warn(`AI model TIMED OUT after ${Date.now() - startTime}ms for user ${userId}`);
        resolve(null);
      }, this.AI_TIMEOUT),
    );

    const aiRecommendations = await Promise.race([aiPromise, timeoutPromise]);
    const duration = Date.now() - startTime;

    if (!aiRecommendations || aiRecommendations.length === 0) {
      this.logger.log(`AI model returned no results for user ${userId} (took ${duration}ms)`);
      return null;
    }

    // Store in DB (replace old recs for this user)
    await this.storeRecommendations(userId, aiRecommendations);

    const result = await this.enrichAiRecommendations(userId, aiRecommendations, limit, page);
    result.source = 'ai';
    this.logger.log(
      `Stored ${aiRecommendations.length} AI recommendations for user ${userId} (took ${duration}ms)`,
    );
    return result;
  }

  /**
   * Replaces all stored recommendations for a user with fresh AI results.
   */
  private async storeRecommendations(userId: string, recs: AiRecommendation[]) {
    // Delete old recommendations for this user
    await this.db.delete(jobRecommendations).where(eq(jobRecommendations.userId, userId));

    // Insert new ones
    if (recs.length > 0) {
      const values = recs
        .filter((r) => r.job_id)
        .map((r) => ({
          userId,
          jobId: r.job_id,
          score: Math.round(r.score),
          reason: r.reason || null,
        }));

      if (values.length > 0) {
        await this.db.insert(jobRecommendations).values(values);
      }
    }
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
          clientName: job.clientName ?? null,
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
            clientName: job.clientName ?? null,
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

  async getCandidateJobGroups(userId: string) {
    const context = await this.getCandidateJobMatchContext(userId);

    if (!context.profile) {
      return CANDIDATE_JOB_GROUPS.map((group) => ({ ...group, count: 0 }));
    }

    const counts = await Promise.all(
      CANDIDATE_JOB_GROUPS.map(async (group) => {
        const conditions = this.buildCandidateJobConditions(context, group.id);
        if (!conditions.length) return { ...group, count: 0 };

        const [result] = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(jobs)
          .where(and(...conditions));

        return { ...group, count: Number(result?.count || 0) };
      }),
    );

    return counts;
  }

  async getCandidateJobGroupJobs(
    userId: string,
    groupId: CandidateJobGroupId,
    query: CandidateJobGroupJobsQueryDto,
  ) {
    if (!CANDIDATE_JOB_GROUP_IDS.includes(groupId)) {
      throw new BadRequestException('Invalid candidate job group');
    }

    const group = CANDIDATE_JOB_GROUPS.find((item) => item.id === groupId)!;
    const context = await this.getCandidateJobMatchContext(userId);
    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 10);

    if (!context.profile) {
      return {
        group,
        data: [],
        pagination: { totalJob: 0, pageCount: 0, currentPage: page, hasNextPage: false },
        source: 'profile-matching',
      };
    }

    const conditions = this.buildCandidateJobConditions(context, groupId);
    if (!conditions.length) {
      return {
        group,
        data: [],
        pagination: { totalJob: 0, pageCount: 0, currentPage: page, hasNextPage: false },
        source: 'profile-matching',
      };
    }

    const relevanceScoreSql = this.buildCandidateRelevanceScoreSql(context);
    const offset = (page - 1) * limit;
    const orderBy = this.getCandidateGroupOrderBy(groupId, relevanceScoreSql);

    const results = await this.db
      .select({
        id: jobs.id,
        recommendationScore: relevanceScoreSql,
      })
      .from(jobs)
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count || 0);
    const jobIds = results.map((job) => job.id);
    const scoreMap = new Map(results.map((job) => [job.id, Number(job.recommendationScore || 0)]));

    let jobsWithRelations: any[] = [];
    if (jobIds.length > 0) {
      const jobsList = await this.db.query.jobs.findMany({
        where: inArray(jobs.id, jobIds),
        with: {
          employer: true,
          company: { columns: { id: true, name: true, logoUrl: true } },
          category: true,
          subCategory: true,
        },
      });

      const jobMap = new Map(jobsList.map((job) => [job.id, job]));
      jobsWithRelations = jobIds
        .map((id) => {
          const job = jobMap.get(id);
          if (!job) return null;

          return {
            ...job,
            isSaved: context.savedJobIds.includes(job.id),
            isApplied: false,
            isWithdrawn: false,
            reapplyDaysLeft: null,
            recommendationScore: Math.round(scoreMap.get(job.id) || 0),
            recommendationReason:
              'Matched your skills, education, job preferences, and experience level',
          };
        })
        .filter(Boolean);
    }

    const totalPages = Math.ceil(total / limit);
    return {
      group,
      data: jobsWithRelations,
      pagination: {
        totalJob: total,
        pageCount: totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
      },
      source: 'profile-matching',
    };
  }

  private async getCandidateJobMatchContext(userId: string): Promise<CandidateJobMatchContext> {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });

    if (!profile) {
      return {
        profile: null,
        preferences: null,
        skillNames: [],
        educationKeywords: [],
        preferenceKeywords: [],
        workKeywords: [],
        experienceYears: 0,
        preferredCategoryIds: [],
        appliedJobIds: [],
        savedJobIds: [],
      };
    }

    const [preferences, candidateSkills, education, experience, appliedJobs, savedJobsList] =
      await Promise.all([
        this.db.query.jobPreferences.findFirst({
          where: eq(jobPreferences.profileId, profile.id),
        }),
        this.db
          .select({ name: skills.name })
          .from(profileSkills)
          .innerJoin(skills, eq(profileSkills.skillId, skills.id))
          .where(eq(profileSkills.profileId, profile.id)),
        this.db.query.educationRecords.findMany({
          where: eq(educationRecords.profileId, profile.id),
          columns: {
            degree: true,
            fieldOfStudy: true,
            relevantCoursework: true,
            description: true,
          },
        }),
        this.db.query.workExperiences.findMany({
          where: eq(workExperiences.profileId, profile.id),
          columns: {
            jobTitle: true,
            designation: true,
            skillsUsed: true,
            description: true,
          },
        }),
        this.db
          .select({ jobId: jobApplications.jobId })
          .from(jobApplications)
          .where(eq(jobApplications.jobSeekerId, userId)),
        this.db
          .select({ jobId: savedJobs.jobId })
          .from(savedJobs)
          .where(eq(savedJobs.jobSeekerId, userId)),
      ]);

    const skillNames = this.normalizeTokens(candidateSkills.map((skill) => skill.name));
    const educationKeywords = this.normalizeTokens(
      education.flatMap((item) => [
        item.degree,
        item.fieldOfStudy,
        item.relevantCoursework,
        item.description,
      ]),
    );
    const preferenceKeywords = this.normalizeTokens([preferences?.preferredIndustries]);
    const workKeywords = this.normalizeTokens(
      experience.flatMap((item) => [
        item.jobTitle,
        item.designation,
        item.skillsUsed,
        item.description,
      ]),
    );

    const preferredCategoryIds = await this.resolvePreferredCategoryIds(
      preferences?.preferredIndustries,
    );

    return {
      profile,
      preferences,
      skillNames,
      educationKeywords,
      preferenceKeywords,
      workKeywords,
      experienceYears: Number(profile.totalExperienceYears || 0),
      preferredCategoryIds,
      appliedJobIds: appliedJobs.map((item) => item.jobId),
      savedJobIds: savedJobsList.map((item) => item.jobId),
    };
  }

  private buildCandidateJobConditions(
    context: CandidateJobMatchContext,
    groupId?: CandidateJobGroupId,
  ) {
    const conditions: any[] = [
      eq(jobs.isActive, true),
      eq(jobs.status, 'active'),
      or(sql`${jobs.deadline} IS NULL`, gte(jobs.deadline, new Date())),
    ];

    if (context.appliedJobIds.length > 0) {
      conditions.push(notInArray(jobs.id, context.appliedJobIds));
    }

    const preferredJobTypes = this.parseJobTypePreferenceList(context.preferences?.jobTypes);
    if (preferredJobTypes.length > 0) {
      conditions.push(
        sql`${jobs.jobType}::text[] && ARRAY[${sql.join(
          preferredJobTypes.map((type) => sql`${type}`),
          sql`, `,
        )}]::text[]`,
      );
    }

    const skillCondition = this.buildSkillMatchCondition(context.skillNames);
    const profileKeywordCondition = this.buildProfileKeywordCondition([
      ...context.educationKeywords,
      ...context.preferenceKeywords,
      ...context.workKeywords,
      context.profile?.headline,
      context.profile?.professionalSummary,
    ]);

    const industryCondition = this.buildPreferredCategoryCondition(context.preferredCategoryIds);
    const relevanceConditions = [skillCondition, profileKeywordCondition].filter(Boolean) as any[];

    if (industryCondition) {
      conditions.push(industryCondition);
    } else if (relevanceConditions.length > 0) {
      conditions.push(or(...relevanceConditions));
    }

    const groupCondition = groupId ? this.buildGroupCondition(groupId) : null;
    if (groupCondition) conditions.push(groupCondition);

    return conditions;
  }

  private buildGroupCondition(groupId: CandidateJobGroupId) {
    switch (groupId) {
      case 'hybrid':
        return or(
          sql`${jobs.workMode}::text[] && ARRAY['hybrid']::text[]`,
          ilike(jobs.title, '%hybrid%'),
          ilike(jobs.description, '%hybrid%'),
          ilike(jobs.benefits, '%hybrid%'),
        );
      case 'remote':
        return sql`${jobs.workMode}::text[] && ARRAY['remote']::text[]`;
      case 'entry_level':
        return or(
          lte(jobs.experienceMax, 1),
          eq(jobs.experienceLevel, 'entry'),
          ilike(jobs.title, '%fresher%'),
          ilike(jobs.title, '%entry%'),
        );
      case 'experienced':
        return or(
          gte(jobs.experienceMax, 2),
          gte(jobs.experienceMin, 2),
          sql`${jobs.experienceLevel} IN ('mid', 'senior', 'lead', 'experienced')`,
        );
      case 'high_paid': {
        const currentSalarySql = this.buildSalaryBenchmarkValueSql();
        const averageSimilarSalarySql = this.buildAverageSimilarSalarySql();
        return sql`${currentSalarySql} IS NOT NULL AND ${currentSalarySql} > (${averageSimilarSalarySql} * 1.3)`;
      }
      case 'most_applied':
        return gte(jobs.applicationCount, 1);
      default:
        return null;
    }
  }

  private buildCandidateRelevanceScoreSql(context: CandidateJobMatchContext) {
    const skillCondition = this.buildSkillMatchCondition(context.skillNames);
    const educationCondition = this.buildProfileKeywordCondition(context.educationKeywords);
    const preferenceIndustryCondition = this.buildProfileKeywordCondition(
      context.preferenceKeywords,
    );
    const workCondition = this.buildProfileKeywordCondition(context.workKeywords);
    const preferredLocations = this.parsePreferenceList(context.preferences?.preferredLocations);
    const preferredJobTypes = this.parseJobTypePreferenceList(context.preferences?.jobTypes);
    const expectedSalaryMin = Number(context.preferences?.expectedSalaryMin || 0);
    const expectedSalaryMax = Number(context.preferences?.expectedSalaryMax || 0);

    const skillScore = skillCondition
      ? sql`CASE WHEN ${skillCondition} THEN 45 ELSE 0 END`
      : sql`0`;
    const educationScore = educationCondition
      ? sql`CASE WHEN ${educationCondition} THEN 15 ELSE 0 END`
      : sql`0`;
    const preferenceScore = preferenceIndustryCondition
      ? sql`CASE WHEN ${preferenceIndustryCondition} THEN 15 ELSE 0 END`
      : sql`0`;
    const workScore = workCondition ? sql`CASE WHEN ${workCondition} THEN 10 ELSE 0 END` : sql`0`;
    const experienceScore = sql`CASE
      WHEN (${jobs.experienceMin} IS NULL OR ${jobs.experienceMin} <= ${context.experienceYears + 1})
       AND (${jobs.experienceMax} IS NULL OR ${jobs.experienceMax} >= ${Math.max(0, context.experienceYears - 1)})
      THEN 20 ELSE 0 END`;
    const locationScore =
      preferredLocations.length > 0
        ? sql`CASE WHEN ${or(
            ...preferredLocations.map((location) =>
              or(
                ilike(jobs.city, `%${location}%`),
                ilike(jobs.state, `%${location}%`),
                ilike(jobs.country, `%${location}%`),
                ilike(jobs.location, `%${location}%`),
                location === 'remote' || location === 'wfh'
                  ? sql`${jobs.workMode}::text[] && ARRAY['remote']::text[]`
                  : location === 'hybrid'
                    ? sql`${jobs.workMode}::text[] && ARRAY['hybrid']::text[]`
                    : undefined,
              ),
            ),
          )} THEN 15 ELSE 0 END`
        : sql`0`;
    const jobTypeScore =
      preferredJobTypes.length > 0
        ? sql`CASE WHEN ${jobs.jobType}::text[] && ARRAY[${sql.join(
            preferredJobTypes.map((type) => sql`${type}`),
            sql`, `,
          )}]::text[] THEN 10 ELSE 0 END`
        : sql`0`;
    const salaryScore =
      expectedSalaryMin > 0 || expectedSalaryMax > 0
        ? sql`CASE
            WHEN ${jobs.salaryMax} IS NULL THEN 0
            WHEN ${expectedSalaryMin} > 0 AND ${jobs.salaryMax} >= ${expectedSalaryMin} THEN 10
            WHEN ${expectedSalaryMax} > 0 AND ${jobs.salaryMin} <= ${expectedSalaryMax} THEN 5
            ELSE 0
          END`
        : sql`0`;
    const engagementScore = sql`LEAST(COALESCE(${jobs.applicationCount}, 0), 100) * 0.05`;
    const recencyScore = sql`CASE
      WHEN ${jobs.createdAt} >= NOW() - INTERVAL '7 days' THEN 5
      WHEN ${jobs.createdAt} >= NOW() - INTERVAL '30 days' THEN 2
      ELSE 0
    END`;

    return sql<number>`(
      ${skillScore} +
      ${educationScore} +
      ${preferenceScore} +
      ${workScore} +
      ${experienceScore} +
      ${locationScore} +
      ${jobTypeScore} +
      ${salaryScore} +
      ${engagementScore} +
      ${recencyScore}
    )`;
  }

  private getCandidateGroupOrderBy(groupId: CandidateJobGroupId, relevanceScoreSql: any) {
    const relevanceOrder = sql`${relevanceScoreSql} DESC`;

    switch (groupId) {
      case 'high_paid':
        return [relevanceOrder, desc(jobs.salaryMax), desc(jobs.createdAt)];
      case 'most_applied':
        return [relevanceOrder, desc(jobs.applicationCount), desc(jobs.createdAt)];
      default:
        return [relevanceOrder, desc(jobs.createdAt)];
    }
  }

  private buildSkillMatchCondition(skillNames: string[]) {
    const skillsToMatch = this.normalizeTokens(skillNames).slice(0, 30);
    if (skillsToMatch.length === 0) return null;

    return or(
      sql`EXISTS (
        SELECT 1 FROM unnest(COALESCE(${jobs.skills}, ARRAY[]::text[])) AS skill_name
        WHERE LOWER(skill_name) IN (${sql.join(
          skillsToMatch.map((skill) => sql`${skill}`),
          sql`, `,
        )})
      )`,
      ...skillsToMatch.map((skill) =>
        or(ilike(jobs.title, `%${skill}%`), ilike(jobs.description, `%${skill}%`)),
      ),
    );
  }

  private buildProfileKeywordCondition(values: any[]) {
    const keywords = this.normalizeTokens(values).slice(0, 40);
    if (keywords.length === 0) return null;

    return or(
      ...keywords.map((keyword) =>
        or(
          ilike(jobs.title, `%${keyword}%`),
          ilike(jobs.description, `%${keyword}%`),
          ilike(jobs.qualification, `%${keyword}%`),
          ilike(jobs.customCategory, `%${keyword}%`),
          ilike(jobs.customSubCategory, `%${keyword}%`),
          sql`EXISTS (
            SELECT 1 FROM unnest(COALESCE(${jobs.skills}, ARRAY[]::text[])) AS skill_name
            WHERE LOWER(skill_name) LIKE ${`%${keyword}%`}
          )`,
          sql`${jobs.categoryId} IN (
            SELECT ${jobCategories.id} FROM ${jobCategories}
            WHERE LOWER(${jobCategories.name}) LIKE ${`%${keyword}%`}
          )`,
          sql`${jobs.subCategoryId} IN (
            SELECT ${jobCategories.id} FROM ${jobCategories}
            WHERE LOWER(${jobCategories.name}) LIKE ${`%${keyword}%`}
          )`,
        ),
      ),
    );
  }

  private buildPreferredCategoryCondition(categoryIds: string[]) {
    if (categoryIds.length === 0) return null;

    return or(inArray(jobs.categoryId, categoryIds), inArray(jobs.subCategoryId, categoryIds));
  }

  private buildSalaryBenchmarkValueSql() {
    return sql<number>`COALESCE(
      (${jobs.salaryMin}::numeric + ${jobs.salaryMax}::numeric) / 2,
      ${jobs.salaryMax}::numeric,
      ${jobs.salaryMin}::numeric
    )`;
  }

  private buildAverageSimilarSalarySql() {
    return sql<number>`(
      SELECT AVG(
        COALESCE(
          (salary_peer.salary_min::numeric + salary_peer.salary_max::numeric) / 2,
          salary_peer.salary_max::numeric,
          salary_peer.salary_min::numeric
        )
      )
      FROM jobs salary_peer
      WHERE salary_peer.id != ${jobs.id}
        AND salary_peer.is_active = true
        AND salary_peer.status = 'active'
        AND (salary_peer.deadline IS NULL OR salary_peer.deadline >= NOW())
        AND salary_peer.category_id IS NOT DISTINCT FROM ${jobs.categoryId}
        AND salary_peer.experience_level IS NOT DISTINCT FROM ${jobs.experienceLevel}
        AND COALESCE(
          (salary_peer.salary_min::numeric + salary_peer.salary_max::numeric) / 2,
          salary_peer.salary_max::numeric,
          salary_peer.salary_min::numeric
        ) IS NOT NULL
    )`;
  }

  private async resolvePreferredCategoryIds(preferredIndustries?: string | null) {
    const preferredValues = this.parseRawPreferenceList(preferredIndustries).map((value) =>
      this.normalizeCategoryText(value),
    );
    if (preferredValues.length === 0) return [];

    const categories = await this.db.query.jobCategories.findMany({
      columns: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
      },
    });

    const matchedParentIds = new Set<string>();
    const matchedCategoryIds = new Set<string>();

    for (const category of categories) {
      const name = this.normalizeCategoryText(category.name);
      const slug = this.normalizeCategoryText(category.slug);
      const isMatch = preferredValues.some(
        (preferredValue) =>
          name === preferredValue ||
          slug === preferredValue ||
          name.includes(preferredValue) ||
          slug.includes(preferredValue) ||
          preferredValue.includes(name) ||
          preferredValue.includes(slug),
      );

      if (!isMatch) continue;
      matchedCategoryIds.add(category.id);
      if (!category.parentId) {
        matchedParentIds.add(category.id);
      }
    }

    for (const category of categories) {
      if (category.parentId && matchedParentIds.has(category.parentId)) {
        matchedCategoryIds.add(category.id);
      }
    }

    return [...matchedCategoryIds];
  }

  private normalizeTokens(values: any[]): string[] {
    const allowedShortTokens = new Set(['ai', 'it', 'qa', 'ui', 'ux']);
    const stopWords = new Set([
      'and',
      'for',
      'the',
      'with',
      'from',
      'job',
      'jobs',
      'work',
      'remote',
      'full',
      'time',
      'part',
      'contract',
      'bachelor',
      'masters',
      'degree',
    ]);

    const tokens = values
      .flatMap((value) =>
        String(value || '')
          .split(/[,/|;]+|\s+-\s+|\s+\|\s+/)
          .map((part) => part.trim().toLowerCase()),
      )
      .flatMap((value) => {
        const cleaned = value
          .replace(/[^\w.+#\s-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (!cleaned) return [];
        const splitWords = cleaned.split(' ').filter(Boolean);
        return cleaned.includes(' ') && cleaned.length <= 40 ? [cleaned, ...splitWords] : [cleaned];
      })
      .map((token) => token.trim())
      .filter((token) => token.length > 0)
      .filter((token) => token.length >= 3 || allowedShortTokens.has(token))
      .filter((token) => !stopWords.has(token));

    return [...new Set(tokens)];
  }

  private parsePreferenceList(value?: string | null): string[] {
    return this.parseRawPreferenceList(value)
      .map((item) => item.toLowerCase().replace(/\s+/g, '_'))
      .filter(Boolean);
  }

  private parseRawPreferenceList(value?: string | null): string[] {
    return String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private parseJobTypePreferenceList(value?: string | null): string[] {
    return this.parsePreferenceList(value).filter((item) => VALID_JOB_TYPE_PREFERENCES.has(item));
  }

  private normalizeCategoryText(value?: string | null) {
    return String(value || '')
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/[^\w\s]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
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
      return [];
    }
  }

  /**
   * Called when a candidate's profile/skills/preferences change.
   * Re-fetches recommendations from AI model and stores in DB.
   */
  async refreshRecommendations(userId: string) {
    const result = await this.fetchAndStoreRecommendations(userId, {});
    return {
      success: true,
      message: result
        ? 'Recommendations refreshed from AI model'
        : 'AI model unavailable, recommendations will be refreshed on next profile change',
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
