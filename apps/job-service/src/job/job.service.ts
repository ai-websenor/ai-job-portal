/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '@ai-job-portal/database';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, isNull, sql, desc, or, ilike, gt, count } from 'drizzle-orm';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JobDiscoveryQueryDto } from './dto/job-discovery-query.dto';
import { RelevantJobsQueryDto } from './dto/relevant-jobs-query.dto';
import { ElasticsearchService } from '../elastic/elastic.service';
import { CustomLogger } from '@ai-job-portal/logger';

@Injectable()
export class JobService {
  private readonly logger = new CustomLogger();
  private readonly isDev = process.env.NODE_ENV !== 'production';

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly elasticsearchService: ElasticsearchService,
  ) {}

  async create(createJobDto: CreateJobDto, user: any) {
    const userId = user.id;
    const userEmail = user.email;

    // DEV-ONLY: Log API request received
    if (this.isDev) {
      this.logger.debug('API Request Received - Create Job', 'JobService', {
        userId,
        userRole: user.role || 'employer',
        userEmail,
        title: createJobDto.title,
        location: createJobDto.location,
        jobType: createJobDto.jobType,
      });
    }

    // DEV-ONLY: Log business logic start
    if (this.isDev) {
      this.logger.debug('Business Logic Started', 'JobService', {
        action: 'CREATE_JOB',
        userId,
      });
    }

    try {
      // 1. Fetch the employer profile using the authenticated userId
      if (this.isDev) {
        this.logger.debug('DB Operation - SELECT Employer', 'JobService', {
          operation: 'SELECT',
          table: 'employers',
          userId,
        });
      }

      let [employer] = await this.db
        .select()
        .from(schema.employers)
        .where(eq(schema.employers.userId, userId))
        .limit(1);

      // 1.5 Fallback: If not found by ID, try finding by email
      if (!employer && userEmail) {
        if (this.isDev) {
          this.logger.debug(
            'Employer Lookup Fallback - By Email',
            'JobService',
            {
              userEmail,
            },
          );
        }

        // Step A: Find the user record directly by email
        const [userRecord] = await this.db
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, userEmail))
          .limit(1);

        if (userRecord) {
          // Step B: Find the employer record using the correct User ID from the DB
          const [employerRecord] = await this.db
            .select()
            .from(schema.employers)
            .where(eq(schema.employers.userId, userRecord.id))
            .limit(1);

          if (employerRecord) {
            employer = employerRecord;
          }
        }
      }

      // DEV-ONLY: Log employer lookup result
      if (this.isDev) {
        this.logger.debug('Employer Lookup Result', 'JobService', {
          found: !!employer,
          employerId: employer?.id,
          companyName: employer?.companyName,
        });
      }

      // 2. Throw error if employer profile not found
      if (!employer) {
        // ALWAYS: Error log (never wrapped in isDev)
        this.logger.error(
          'Employer profile not found',
          this.isDev ? new Error('Employer profile lookup failed') : undefined,
          'JobService',
          { userId, userEmail, action: 'CREATE_JOB' },
        );

        throw new BadRequestException(
          `Employer profile not found. Please ensure you are logged in as an employer.`,
        );
      }

      const { applicationDeadline: deadline, ...restJobData } = createJobDto;

      const jobData = {
        ...restJobData,
        deadline: deadline ? new Date(deadline) : null,
        employerId: employer.id,
      };

      // Check for duplicate active job
      const [existingJob] = await this.db
        .select()
        .from(schema.jobs)
        .where(
          and(
            eq(schema.jobs.employerId, employer.id),
            eq(schema.jobs.title, createJobDto.title),
            eq(schema.jobs.jobType, createJobDto.jobType),
            eq(schema.jobs.experienceLevel, createJobDto.experienceLevel),
            createJobDto.city
              ? eq(schema.jobs.city, createJobDto.city)
              : isNull(schema.jobs.city),
            createJobDto.state
              ? eq(schema.jobs.state, createJobDto.state)
              : isNull(schema.jobs.state),
            eq(schema.jobs.workType, createJobDto.workType),
            eq(schema.jobs.isActive, true),
          ),
        )
        .limit(1);

      if (existingJob) {
        // Log only when duplicate is found
        if (this.isDev) {
          this.logger.warn('Duplicate Active Job Detected', 'JobService', {
            employerId: employer.id,
            title: createJobDto.title,
            jobType: createJobDto.jobType,
            existingJobId: existingJob.id,
          });
        }

        throw new ConflictException(
          'You already have an active job with similar details',
        );
      }

      // DEV-ONLY: Log database INSERT operation
      if (this.isDev) {
        this.logger.debug('DB Operation - INSERT Job', 'JobService', {
          operation: 'INSERT',
          table: 'jobs',
          employerId: employer.id,
          title: jobData.title,
          jobType: jobData.jobType,
        });
      }

      const [job] = await this.db
        .insert(schema.jobs)
        .values(jobData as any)
        .returning();

      // DEV-ONLY: Log successful job creation
      if (this.isDev) {
        this.logger.success('Job Created Successfully', 'JobService', {
          jobId: job.id,
          title: job.title,
          employerId: job.employerId,
          isActive: job.isActive,
        });
      }

      // Index job in Elasticsearch (non-blocking)
      this.elasticsearchService.indexJob(job.id).catch((err) => {
        // ALWAYS: Error log for Elasticsearch indexing failures
        this.logger.error(
          'Failed to index job in Elasticsearch',
          this.isDev ? err : undefined,
          'JobService',
          { jobId: job.id, action: 'ELASTICSEARCH_INDEX' },
        );
      });

      // DEV-ONLY: Log API response
      if (this.isDev) {
        this.logger.debug('API Response - Job Created', 'JobService', {
          jobId: job.id,
          title: job.title,
          statusCode: 201,
        });
      }

      return {
        message: 'Job created successfully',
        ...job,
      };
    } catch (error) {
      // ALWAYS: Error log (never wrapped in isDev)
      this.logger.error(
        'Job creation failed',
        this.isDev ? error : undefined,
        'JobService',
        { userId, action: 'CREATE_JOB', title: createJobDto.title },
      );
      throw error;
    }
  }

  async findAll(query: any) {
    // DEV-ONLY: Log API request received
    if (this.isDev) {
      this.logger.debug('API Request Received - Find All Jobs', 'JobService', {
        page: query.page,
        limit: query.limit,
      });
    }

    // Basic implementation
    const limit = query.limit || 10;
    const offset = (query.page - 1) * limit || 0;

    // DEV-ONLY: Log database operation
    if (this.isDev) {
      this.logger.debug('DB Operation - SELECT Jobs', 'JobService', {
        operation: 'SELECT',
        table: 'jobs',
        limit,
        offset,
      });
    }

    // Fetch jobs with company name by joining with employers table
    const jobs = await this.db
      .select({
        id: schema.jobs.id,
        employerId: schema.jobs.employerId,
        title: schema.jobs.title,
        description: schema.jobs.description,
        jobType: schema.jobs.jobType,
        workType: schema.jobs.workType,
        experienceLevel: schema.jobs.experienceLevel,
        location: schema.jobs.location,
        city: schema.jobs.city,
        state: schema.jobs.state,
        salaryMin: schema.jobs.salaryMin,
        salaryMax: schema.jobs.salaryMax,
        payRate: schema.jobs.payRate,
        showSalary: schema.jobs.showSalary,
        skills: schema.jobs.skills,
        deadline: schema.jobs.deadline,
        isActive: schema.jobs.isActive,
        isFeatured: schema.jobs.isFeatured,
        isHighlighted: schema.jobs.isHighlighted,
        viewCount: schema.jobs.viewCount,
        applicationCount: schema.jobs.applicationCount,
        createdAt: schema.jobs.createdAt,
        updatedAt: schema.jobs.updatedAt,
        company_name: schema.employers.companyName,
      })
      .from(schema.jobs)
      .innerJoin(
        schema.employers,
        eq(schema.jobs.employerId, schema.employers.id),
      )
      .limit(limit)
      .offset(offset)
      .orderBy(schema.jobs.createdAt);

    const [countRes] = await this.db
      .select({ count: count() })
      .from(schema.jobs);
    const totalCount = countRes?.count || 0;

    // DEV-ONLY: Log API response
    if (this.isDev) {
      this.logger.debug('API Response - Jobs Retrieved', 'JobService', {
        count: jobs.length,
        total: totalCount,
        statusCode: 200,
      });
    }

    return {
      message:
        jobs.length > 0 ? 'Jobs retrieved successfully' : 'No jobs found',
      jobs,
      total: totalCount,
    };
  }

  async findOne(id: string) {
    // DEV-ONLY: Log API request received
    if (this.isDev) {
      this.logger.debug('API Request Received - Find Job By ID', 'JobService', {
        jobId: id,
      });
    }

    // DEV-ONLY: Log database operation
    if (this.isDev) {
      this.logger.debug('DB Operation - SELECT Job', 'JobService', {
        operation: 'SELECT',
        table: 'jobs',
        jobId: id,
      });
    }

    const [job] = await this.db
      .select({
        id: schema.jobs.id,
        employerId: schema.jobs.employerId,
        title: schema.jobs.title,
        description: schema.jobs.description,
        jobType: schema.jobs.jobType,
        workType: schema.jobs.workType,
        experienceLevel: schema.jobs.experienceLevel,
        location: schema.jobs.location,
        city: schema.jobs.city,
        state: schema.jobs.state,
        salaryMin: schema.jobs.salaryMin,
        salaryMax: schema.jobs.salaryMax,
        payRate: schema.jobs.payRate,
        showSalary: schema.jobs.showSalary,
        skills: schema.jobs.skills,
        deadline: schema.jobs.deadline,
        isActive: schema.jobs.isActive,
        isFeatured: schema.jobs.isFeatured,
        isHighlighted: schema.jobs.isHighlighted,
        viewCount: schema.jobs.viewCount,
        applicationCount: schema.jobs.applicationCount,
        createdAt: schema.jobs.createdAt,
        updatedAt: schema.jobs.updatedAt,
        company_name: schema.employers.companyName,
      })
      .from(schema.jobs)
      .innerJoin(
        schema.employers,
        eq(schema.jobs.employerId, schema.employers.id),
      )
      .where(eq(schema.jobs.id, id))
      .limit(1);

    if (!job) {
      // ALWAYS: Error log
      this.logger.error(
        'Job not found',
        this.isDev ? new Error('Job lookup failed') : undefined,
        'JobService',
        { jobId: id, action: 'FIND_JOB' },
      );

      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    // Increment view count and update last activity
    // We do this asynchronously to not block the read response
    this.db
      .update(schema.jobs)
      .set({
        viewCount: sql`${schema.jobs.viewCount} + 1`,
        lastActivityAt: new Date(),
      })
      .where(eq(schema.jobs.id, id))
      .execute();

    // DEV-ONLY: Log API response
    if (this.isDev) {
      this.logger.debug('API Response - Job Retrieved', 'JobService', {
        jobId: job.id,
        title: job.title,
        statusCode: 200,
      });
    }

    return {
      message: 'Job retrieved successfully',
      ...job,
    };
  }

  // Get trending jobs condition created in last 14 days, mini applicationCount 1, lastActivityAt in last 14 days

  async getTrendingJobs(query: JobDiscoveryQueryDto) {
    const limit = query.limit || 10;
    const offset = ((query.page || 1) - 1) * limit;

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Helper to build base filters
    const buildFilters = (withTimeWindow: boolean) => {
      const filters = [eq(schema.jobs.isActive, true)];

      // Company Filter
      if (query.companyId) {
        filters.push(eq(schema.jobs.companyId, query.companyId));
      }

      // Location Filter
      if (query.location) {
        const loc = `%${query.location}%`;
        const locationFilter = or(
          ilike(schema.jobs.city, loc),
          ilike(schema.jobs.state, loc),
          ilike(schema.jobs.location, loc),
        );

        if (locationFilter) {
          filters.push(locationFilter);
        }
      }

      // Category Filter (ID check)
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          query.category || '',
        );

      if (query.category && isUUID) {
        filters.push(eq(schema.jobs.categoryId, query.category));
      }

      // 🔥 UPDATED: Trending eligibility rule
      if (withTimeWindow) {
        // Enforce minimum application count (Must have at least 1 application)
        filters.push(gt(schema.jobs.applicationCount, 0));

        const trendingFilter = or(
          // Recent activity
          gt(schema.jobs.lastActivityAt, fourteenDaysAgo),

          // Recently created
          gt(schema.jobs.createdAt, fourteenDaysAgo),

          // Minimum engagement
          gt(schema.jobs.viewCount, 0),
        );

        if (trendingFilter) {
          filters.push(trendingFilter);
        }
      }

      return filters;
    };

    // Helper to execute query
    const executeQuery = async (withTimeWindow: boolean) => {
      let queryBuilder = this.db
        .select({
          id: schema.jobs.id,
          employerId: schema.jobs.employerId,
          title: schema.jobs.title,
          description: schema.jobs.description,
          jobType: schema.jobs.jobType,
          workType: schema.jobs.workType,
          experienceLevel: schema.jobs.experienceLevel,
          location: schema.jobs.location,
          city: schema.jobs.city,
          state: schema.jobs.state,
          salaryMin: schema.jobs.salaryMin,
          salaryMax: schema.jobs.salaryMax,
          payRate: schema.jobs.payRate,
          showSalary: schema.jobs.showSalary,
          skills: schema.jobs.skills,
          deadline: schema.jobs.deadline,
          isActive: schema.jobs.isActive,
          isFeatured: schema.jobs.isFeatured,
          isHighlighted: schema.jobs.isHighlighted,
          viewCount: schema.jobs.viewCount,
          applicationCount: schema.jobs.applicationCount,
          createdAt: schema.jobs.createdAt,
          updatedAt: schema.jobs.updatedAt,
          lastActivityAt: schema.jobs.lastActivityAt,
          company_name: schema.employers.companyName,
        })
        .from(schema.jobs)
        .innerJoin(
          schema.employers,
          eq(schema.jobs.employerId, schema.employers.id),
        );

      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          query.category || '',
        );

      // Join Category if needed (slug)
      if (query.category && !isUUID) {
        queryBuilder = queryBuilder.innerJoin(
          schema.jobCategories,
          eq(schema.jobs.categoryId, schema.jobCategories.id),
        ) as any;
      }

      const filters = buildFilters(withTimeWindow);

      if (query.category && !isUUID) {
        filters.push(eq(schema.jobCategories.slug, query.category));
      }

      return queryBuilder
        .where(and(...filters))
        .orderBy(
          desc(schema.jobs.lastActivityAt),
          desc(schema.jobs.applicationCount),
          desc(schema.jobs.viewCount),
          desc(schema.jobs.createdAt),
        )
        .limit(limit)
        .offset(offset);
    };

    // Count helper
    const getCount = async (withWindow: boolean) => {
      let countBuilder = this.db.select({ count: count() }).from(schema.jobs);

      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          query.category || '',
        );

      if (query.category && !isUUID) {
        countBuilder = countBuilder.innerJoin(
          schema.jobCategories,
          eq(schema.jobs.categoryId, schema.jobCategories.id),
        ) as any;
      }

      const filters = buildFilters(withWindow);

      if (query.category && !isUUID) {
        filters.push(eq(schema.jobCategories.slug, query.category));
      }

      const [res] = await countBuilder.where(and(...filters));
      return res?.count || 0;
    };

    // 🔥 Trending first, fallback if empty
    const countWithWindow = await getCount(true);

    const data =
      countWithWindow > 0
        ? await executeQuery(true)
        : await executeQuery(false);

    const total = countWithWindow > 0 ? countWithWindow : await getCount(false);

    return {
      data,
      pagination: {
        page: query.page || 1,
        limit,
        total,
      },
    };
  }
  // Popular jobs logic implemented based views and no of applications
  async getPopularJobs(query: JobDiscoveryQueryDto) {
    const limit = query.limit || 10;
    const offset = ((query.page || 1) - 1) * limit;

    const buildFilters = () => {
      const filters = [eq(schema.jobs.isActive, true)];

      if (query.companyId) {
        filters.push(eq(schema.jobs.companyId, query.companyId));
      }

      if (query.location) {
        const loc = `%${query.location}%`;
        const locationFilter = or(
          ilike(schema.jobs.city, loc),
          ilike(schema.jobs.state, loc),
          ilike(schema.jobs.location, loc),
        );
        if (locationFilter) {
          filters.push(locationFilter);
        }
      }

      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          query.category || '',
        );
      if (query.category && isUUID) {
        filters.push(eq(schema.jobs.categoryId, query.category));
      }

      return filters;
    };

    let queryBuilder = this.db
      .select({
        id: schema.jobs.id,
        employerId: schema.jobs.employerId,
        title: schema.jobs.title,
        description: schema.jobs.description,
        jobType: schema.jobs.jobType,
        workType: schema.jobs.workType,
        experienceLevel: schema.jobs.experienceLevel,
        location: schema.jobs.location,
        city: schema.jobs.city,
        state: schema.jobs.state,
        salaryMin: schema.jobs.salaryMin,
        salaryMax: schema.jobs.salaryMax,
        payRate: schema.jobs.payRate,
        showSalary: schema.jobs.showSalary,
        skills: schema.jobs.skills,
        deadline: schema.jobs.deadline,
        isActive: schema.jobs.isActive,
        isFeatured: schema.jobs.isFeatured,
        isHighlighted: schema.jobs.isHighlighted,
        viewCount: schema.jobs.viewCount,
        applicationCount: schema.jobs.applicationCount,
        createdAt: schema.jobs.createdAt,
        updatedAt: schema.jobs.updatedAt,
        lastActivityAt: schema.jobs.lastActivityAt,
        company_name: schema.employers.companyName,
      })
      .from(schema.jobs)
      .innerJoin(
        schema.employers,
        eq(schema.jobs.employerId, schema.employers.id),
      );

    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        query.category || '',
      );

    if (query.category && !isUUID) {
      queryBuilder = queryBuilder.innerJoin(
        schema.jobCategories,
        eq(schema.jobs.categoryId, schema.jobCategories.id),
      ) as any;
    }

    const filters = buildFilters();
    if (query.category && !isUUID) {
      filters.push(eq(schema.jobCategories.slug, query.category));
    }

    const jobs = await queryBuilder
      .where(and(...filters))
      .limit(limit)
      .offset(offset)
      .orderBy(
        desc(schema.jobs.applicationCount),
        desc(schema.jobs.viewCount),
        desc(schema.jobs.createdAt),
      );

    // Quick Count
    let countBuilder = this.db.select({ count: count() }).from(schema.jobs);

    if (query.category && !isUUID) {
      countBuilder = countBuilder.innerJoin(
        schema.jobCategories,
        eq(schema.jobs.categoryId, schema.jobCategories.id),
      ) as any;
    }

    const [countRes] = await countBuilder.where(and(...filters));
    const total = countRes?.count || 0;

    return {
      data: jobs,
      pagination: {
        page: query.page || 1,
        limit,
        total,
      },
    };
  }

  // Relevant jobs - personalized for candidates based on preferences
  async getRelevantJobs(query: RelevantJobsQueryDto, user: any) {
    const limit = query.limit || 10;
    const offset = ((query.page || 1) - 1) * limit;

    // Step 1: Fetch candidate profile
    const [profile] = await this.db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, user.id))
      .limit(1);

    if (!profile) {
      return {
        data: [],
        pagination: {
          page: query.page || 1,
          limit,
          total: 0,
        },
      };
    }

    // Step 2: Fetch job preferences
    const [preferences] = await this.db
      .select()
      .from(schema.jobPreferences)
      .where(eq(schema.jobPreferences.profileId, profile.id))
      .limit(1);

    // Return empty if no preferences or not actively looking
    if (!preferences || preferences.jobSearchStatus !== 'actively_looking') {
      return {
        data: [],
        pagination: {
          page: query.page || 1,
          limit,
          total: 0,
        },
      };
    }

    // Step 3: Parse and normalize preference arrays
    let jobTypes: string[] = [];
    let preferredLocations: string[] = [];
    let preferredIndustries: string[] = [];

    try {
      if (preferences.jobTypes) {
        const parsed = JSON.parse(preferences.jobTypes);
        jobTypes = Array.isArray(parsed)
          ? parsed.map((t) => String(t).toLowerCase())
          : [];
      }
    } catch {
      jobTypes = [];
    }

    try {
      if (preferences.preferredLocations) {
        const parsed = JSON.parse(preferences.preferredLocations);
        preferredLocations = Array.isArray(parsed)
          ? parsed.map((l) => String(l).toLowerCase())
          : [];
      }
    } catch {
      preferredLocations = [];
    }

    try {
      if (preferences.preferredIndustries) {
        const parsed = JSON.parse(preferences.preferredIndustries);
        preferredIndustries = Array.isArray(parsed)
          ? parsed.map((i) => String(i).toLowerCase())
          : [];
      }
    } catch {
      preferredIndustries = [];
    }

    // If all preference arrays are empty, return empty result
    if (
      jobTypes.length === 0 &&
      preferredLocations.length === 0 &&
      preferredIndustries.length === 0
    ) {
      return {
        data: [],
        pagination: {
          page: query.page || 1,
          limit,
          total: 0,
        },
      };
    }

    // Step 4: Build SQL query with scoring
    // Pre-filtering conditions (at least one must match)
    const preFilters: any[] = [];

    if (jobTypes.length > 0) {
      preFilters.push(
        or(
          ...jobTypes.map((t) =>
            eq(sql`LOWER(${schema.jobs.jobType})`, t.toLowerCase()),
          ),
        ),
      );
    }

    if (preferredLocations.length > 0) {
      preFilters.push(
        or(
          ...preferredLocations.flatMap((loc) => [
            eq(sql`LOWER(${schema.jobs.city})`, loc.toLowerCase()),
            eq(sql`LOWER(${schema.jobs.state})`, loc.toLowerCase()),
          ]),
        ),
      );
    }

    if (preferredIndustries.length > 0) {
      preFilters.push(
        or(
          ...preferredIndustries.map((ind) =>
            eq(
              sql`COALESCE(LOWER(${schema.companies.industry}), '')`,
              ind.toLowerCase(),
            ),
          ),
        ),
      );
    }

    // Base filters (always apply)
    const baseFilters = [
      eq(schema.jobs.isActive, true),
      or(isNull(schema.jobs.deadline), gt(schema.jobs.deadline, new Date())),
    ];

    // Combine pre-filters with OR
    const combinedFilters =
      preFilters.length > 0 ? [...baseFilters, or(...preFilters)] : baseFilters;

    // Build relevance score calculation
    // Use OR conditions instead of ANY() to avoid sql.raw() interpolation issues
    const jobTypeScore =
      jobTypes.length > 0
        ? sql`CASE WHEN ${or(...jobTypes.map((t) => eq(sql`LOWER(${schema.jobs.jobType})`, t.toLowerCase())))} THEN 30 ELSE 0 END`
        : sql`0`;

    const locationScore =
      preferredLocations.length > 0
        ? sql`CASE WHEN ${or(
            ...preferredLocations.flatMap((loc) => [
              eq(sql`LOWER(${schema.jobs.city})`, loc.toLowerCase()),
              eq(sql`LOWER(${schema.jobs.state})`, loc.toLowerCase()),
            ]),
          )} THEN 30 ELSE 0 END`
        : sql`0`;

    const industryScore =
      preferredIndustries.length > 0
        ? sql`CASE WHEN ${or(...preferredIndustries.map((ind) => eq(sql`LOWER(${schema.companies.industry})`, ind.toLowerCase())))} THEN 20 ELSE 0 END`
        : sql`0`;

    const relevanceScoreExpr = sql<number>`
      ${jobTypeScore} +
      ${locationScore} +
      ${industryScore} +
      CASE 
        WHEN ${schema.jobs.salaryMin} IS NOT NULL 
          AND ${schema.jobs.salaryMax} IS NOT NULL
          AND ${preferences.expectedSalaryMin} IS NOT NULL
          AND ${preferences.expectedSalaryMax} IS NOT NULL
          AND ${schema.jobs.salaryMax} >= ${preferences.expectedSalaryMin}
          AND ${schema.jobs.salaryMin} <= ${preferences.expectedSalaryMax}
          AND ${schema.jobs.showSalary} = true
        THEN 10 ELSE 0 
      END +
      CASE WHEN ${schema.jobs.workType} = ${preferences.workShift} THEN 10 ELSE 0 END
    `;

    // Main query - fetch jobs without scoring in SQL to avoid parameter binding issues
    const jobs = await this.db
      .select({
        id: schema.jobs.id,
        employerId: schema.jobs.employerId,
        title: schema.jobs.title,
        description: schema.jobs.description,
        jobType: schema.jobs.jobType,
        workType: schema.jobs.workType,
        experienceLevel: schema.jobs.experienceLevel,
        location: schema.jobs.location,
        city: schema.jobs.city,
        state: schema.jobs.state,
        salaryMin: schema.jobs.salaryMin,
        salaryMax: schema.jobs.salaryMax,
        payRate: schema.jobs.payRate,
        showSalary: schema.jobs.showSalary,
        skills: schema.jobs.skills,
        deadline: schema.jobs.deadline,
        isActive: schema.jobs.isActive,
        isFeatured: schema.jobs.isFeatured,
        isHighlighted: schema.jobs.isHighlighted,
        viewCount: schema.jobs.viewCount,
        applicationCount: schema.jobs.applicationCount,
        createdAt: schema.jobs.createdAt,
        updatedAt: schema.jobs.updatedAt,
        company_name: schema.employers.companyName,
        company_industry: schema.companies.industry,
      })
      .from(schema.jobs)
      .innerJoin(
        schema.employers,
        eq(schema.jobs.employerId, schema.employers.id),
      )
      .leftJoin(
        schema.companies,
        eq(schema.jobs.companyId, schema.companies.id),
      )
      .where(and(...combinedFilters))
      .orderBy(desc(schema.jobs.createdAt));

    // Calculate relevance scores in-memory
    const jobsWithScores = jobs.map((job) => {
      let score = 0;

      // Job type match: +30
      if (jobTypes.includes(job.jobType?.toLowerCase() || '')) {
        score += 30;
      }

      // Location match (city or state): +30
      const jobCity = (job.city || '').toLowerCase();
      const jobState = (job.state || '').toLowerCase();
      if (
        preferredLocations.some((loc) => loc === jobCity || loc === jobState)
      ) {
        score += 30;
      }

      // Industry match: +20
      const jobIndustry = (job.company_industry || '').toLowerCase();
      if (preferredIndustries.includes(jobIndustry)) {
        score += 20;
      }

      // Salary overlap: +10
      if (
        job.salaryMin != null &&
        job.salaryMax != null &&
        preferences.expectedSalaryMin != null &&
        preferences.expectedSalaryMax != null &&
        job.showSalary &&
        Number(job.salaryMax) >= Number(preferences.expectedSalaryMin) &&
        Number(job.salaryMin) <= Number(preferences.expectedSalaryMax)
      ) {
        score += 10;
      }

      // Work type match: +10
      if (job.workType === preferences.workShift) {
        score += 10;
      }

      return { ...job, relevance_score: score };
    });

    // Sort by relevance score (DESC), then by createdAt (DESC)
    jobsWithScores.sort((a, b) => {
      if (b.relevance_score !== a.relevance_score) {
        return b.relevance_score - a.relevance_score;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Apply pagination after sorting
    const paginatedJobs = jobsWithScores.slice(offset, offset + limit);

    // Count query
    const [countRes] = await this.db
      .select({ count: count() })
      .from(schema.jobs)
      .leftJoin(
        schema.companies,
        eq(schema.jobs.companyId, schema.companies.id),
      )
      .where(and(...combinedFilters));

    const total = countRes?.count || 0;

    // Strip company_industry and relevance_score from response
    const jobsWithoutScore = paginatedJobs.map(
      ({ relevance_score, company_industry, ...job }) => job,
    );

    return {
      data: jobsWithoutScore,
      pagination: {
        page: query.page || 1,
        limit,
        total,
      },
    };
  }

  async findMyJobs(user: any, query: any) {
    // DEV-ONLY: Log API request received
    if (this.isDev) {
      this.logger.debug('API Request Received - Find My Jobs', 'JobService', {
        userId: user.id,
        page: query.page,
        limit: query.limit,
      });
    }

    // Get employer profile for the authenticated user
    if (this.isDev) {
      this.logger.debug('DB Operation - SELECT Employer', 'JobService', {
        operation: 'SELECT',
        table: 'employers',
        userId: user.id,
      });
    }

    const [employer] = await this.db
      .select()
      .from(schema.employers)
      .where(eq(schema.employers.userId, user.id))
      .limit(1);

    if (!employer) {
      // ALWAYS: Error log
      this.logger.error(
        'Employer profile not found',
        this.isDev ? new Error('Employer profile lookup failed') : undefined,
        'JobService',
        { userId: user.id, action: 'FIND_MY_JOBS' },
      );

      throw new BadRequestException('Employer profile not found');
    }

    const limit = query.limit || 10;
    const offset = (query.page - 1) * limit || 0;

    // DEV-ONLY: Log database SELECT operation
    if (this.isDev) {
      this.logger.debug('DB Operation - SELECT My Jobs', 'JobService', {
        operation: 'SELECT',
        table: 'jobs',
        employerId: employer.id,
        limit,
        offset,
      });
    }

    // Fetch jobs created by this employer with company name
    const jobs = await this.db
      .select({
        id: schema.jobs.id,
        employerId: schema.jobs.employerId,
        title: schema.jobs.title,
        description: schema.jobs.description,
        jobType: schema.jobs.jobType,
        workType: schema.jobs.workType,
        experienceLevel: schema.jobs.experienceLevel,
        location: schema.jobs.location,
        city: schema.jobs.city,
        state: schema.jobs.state,
        salaryMin: schema.jobs.salaryMin,
        salaryMax: schema.jobs.salaryMax,
        payRate: schema.jobs.payRate,
        showSalary: schema.jobs.showSalary,
        skills: schema.jobs.skills,
        deadline: schema.jobs.deadline,
        isActive: schema.jobs.isActive,
        isFeatured: schema.jobs.isFeatured,
        isHighlighted: schema.jobs.isHighlighted,
        viewCount: schema.jobs.viewCount,
        applicationCount: schema.jobs.applicationCount,
        createdAt: schema.jobs.createdAt,
        updatedAt: schema.jobs.updatedAt,
        company_name: schema.employers.companyName,
      })
      .from(schema.jobs)
      .innerJoin(
        schema.employers,
        eq(schema.jobs.employerId, schema.employers.id),
      )
      .where(eq(schema.jobs.employerId, employer.id))
      .limit(limit)
      .offset(offset)
      .orderBy(schema.jobs.createdAt);

    const [countRes] = await this.db
      .select({ count: count() })
      .from(schema.jobs)
      .where(eq(schema.jobs.employerId, employer.id));

    const total = countRes ? Number(countRes.count) : 0;

    // DEV-ONLY: Log API response
    if (this.isDev) {
      this.logger.debug('API Response - My Jobs Retrieved', 'JobService', {
        count: jobs.length,
        total,
        statusCode: 200,
      });
    }

    return {
      message:
        jobs.length > 0 ? 'Jobs retrieved successfully' : 'No jobs found',
      jobs,
      total,
    };
  }

  async findMyJobById(id: string, user: any) {
    // Get employer profile for the authenticated user
    const [employer] = await this.db
      .select()
      .from(schema.employers)
      .where(eq(schema.employers.userId, user.id))
      .limit(1);

    if (!employer) {
      throw new BadRequestException('Employer profile not found');
    }

    // Fetch the specific job with company name
    const [job] = await this.db
      .select({
        id: schema.jobs.id,
        employerId: schema.jobs.employerId,
        title: schema.jobs.title,
        description: schema.jobs.description,
        jobType: schema.jobs.jobType,
        workType: schema.jobs.workType,
        experienceLevel: schema.jobs.experienceLevel,
        location: schema.jobs.location,
        city: schema.jobs.city,
        state: schema.jobs.state,
        salaryMin: schema.jobs.salaryMin,
        salaryMax: schema.jobs.salaryMax,
        payRate: schema.jobs.payRate,
        showSalary: schema.jobs.showSalary,
        skills: schema.jobs.skills,
        deadline: schema.jobs.deadline,
        isActive: schema.jobs.isActive,
        isFeatured: schema.jobs.isFeatured,
        isHighlighted: schema.jobs.isHighlighted,
        viewCount: schema.jobs.viewCount,
        applicationCount: schema.jobs.applicationCount,
        createdAt: schema.jobs.createdAt,
        updatedAt: schema.jobs.updatedAt,
        company_name: schema.employers.companyName,
      })
      .from(schema.jobs)
      .innerJoin(
        schema.employers,
        eq(schema.jobs.employerId, schema.employers.id),
      )
      .where(
        and(eq(schema.jobs.id, id), eq(schema.jobs.employerId, employer.id)),
      )
      .limit(1);

    if (!job) {
      throw new NotFoundException(
        `Job with ID ${id} not found or you don't have permission to view it`,
      );
    }

    return {
      message: 'Job retrieved successfully',
      ...job,
    };
  }

  async update(id: string, updateJobDto: UpdateJobDto, user: any) {
    // DEV-ONLY: Log API request received
    if (this.isDev) {
      this.logger.debug('API Request Received - Update Job', 'JobService', {
        jobId: id,
        userId: user.id,
        userRole: user.role || 'employer',
        title: updateJobDto.title,
      });
    }

    // DEV-ONLY: Log business logic start
    if (this.isDev) {
      this.logger.debug('Business Logic Started', 'JobService', {
        action: 'UPDATE_JOB',
        jobId: id,
        userId: user.id,
      });
    }

    try {
      // 1. Check if job exists and get employer ID
      if (this.isDev) {
        this.logger.debug('DB Operation - Check Job Exists', 'JobService', {
          operation: 'SELECT',
          table: 'jobs',
          jobId: id,
        });
      }

      const job = await this.db.query.jobs.findFirst({
        where: eq(schema.jobs.id, id),
      });

      if (!job) {
        // ALWAYS: Error log
        this.logger.error(
          'Job not found for update',
          this.isDev ? new Error('Job lookup failed') : undefined,
          'JobService',
          { jobId: id, userId: user.id, action: 'UPDATE_JOB' },
        );

        throw new NotFoundException(`Job with ID ${id} not found`);
      }

      // 2. Get employer profile for the authenticated user
      if (this.isDev) {
        this.logger.debug('DB Operation - SELECT Employer', 'JobService', {
          operation: 'SELECT',
          table: 'employers',
          userId: user.id,
        });
      }

      const [employer] = await this.db
        .select()
        .from(schema.employers)
        .where(eq(schema.employers.userId, user.id))
        .limit(1);

      if (!employer) {
        // ALWAYS: Error log
        this.logger.error(
          'Employer profile not found',
          this.isDev ? new Error('Employer profile lookup failed') : undefined,
          'JobService',
          { userId: user.id, action: 'UPDATE_JOB' },
        );

        throw new BadRequestException('Employer profile not found');
      }

      // 3. Check ownership
      if (this.isDev) {
        this.logger.debug('Ownership Verification', 'JobService', {
          jobEmployerId: job.employerId,
          currentEmployerId: employer.id,
          isOwner: job.employerId === employer.id,
        });
      }

      if (job.employerId !== employer.id) {
        // ALWAYS: Error log
        this.logger.error(
          'Ownership verification failed',
          this.isDev ? new Error('Forbidden - not job owner') : undefined,
          'JobService',
          { jobId: id, userId: user.id, action: 'UPDATE_JOB' },
        );

        throw new ForbiddenException('You can only update your own jobs');
      }

      // 4. Perform update
      const { applicationDeadline: deadline, ...restUpdateData } = updateJobDto;

      const updateData = {
        ...restUpdateData,
        ...(deadline && { deadline: new Date(deadline) }),
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      };

      // DEV-ONLY: Log database UPDATE operation
      if (this.isDev) {
        this.logger.debug('DB Operation - UPDATE Job', 'JobService', {
          operation: 'UPDATE',
          table: 'jobs',
          jobId: id,
          fieldsUpdated: Object.keys(updateData).join(', '),
        });
      }

      const [updatedJob] = await this.db
        .update(schema.jobs)
        .set(updateData)
        .where(eq(schema.jobs.id, id))
        .returning();

      // DEV-ONLY: Log successful update
      if (this.isDev) {
        this.logger.success('Job Updated Successfully', 'JobService', {
          jobId: updatedJob.id,
          title: updatedJob.title,
        });
      }

      // Re-index job in Elasticsearch (non-blocking)
      this.elasticsearchService.indexJob(id).catch((err) => {
        // ALWAYS: Error log for Elasticsearch failures
        this.logger.error(
          'Failed to re-index job in Elasticsearch',
          this.isDev ? err : undefined,
          'JobService',
          { jobId: id, action: 'ELASTICSEARCH_REINDEX' },
        );
      });

      // DEV-ONLY: Log API response
      if (this.isDev) {
        this.logger.debug('API Response - Job Updated', 'JobService', {
          jobId: updatedJob.id,
          statusCode: 200,
        });
      }

      return {
        message: 'Job updated successfully',
        ...updatedJob,
      };
    } catch (error) {
      // ALWAYS: Error log (unless already logged above)
      if (
        !(error instanceof NotFoundException) &&
        !(error instanceof BadRequestException) &&
        !(error instanceof ForbiddenException)
      ) {
        this.logger.error(
          'Job update failed',
          this.isDev ? error : undefined,
          'JobService',
          { jobId: id, userId: user.id, action: 'UPDATE_JOB' },
        );
      }
      throw error;
    }
  }

  async remove(id: string, user: any) {
    // DEV-ONLY: Log API request received
    if (this.isDev) {
      this.logger.debug('API Request Received - Delete Job', 'JobService', {
        jobId: id,
        userId: user.id,
        userRole: user.role || 'employer',
      });
    }

    // DEV-ONLY: Log business logic start
    if (this.isDev) {
      this.logger.debug('Business Logic Started', 'JobService', {
        action: 'DELETE_JOB',
        jobId: id,
        userId: user.id,
      });
    }

    try {
      // 1. Check if job exists and get employer ID
      if (this.isDev) {
        this.logger.debug('DB Operation - Check Job Exists', 'JobService', {
          operation: 'SELECT',
          table: 'jobs',
          jobId: id,
        });
      }

      const job = await this.db.query.jobs.findFirst({
        where: eq(schema.jobs.id, id),
      });

      if (!job) {
        // ALWAYS: Error log
        this.logger.error(
          'Job not found for deletion',
          this.isDev ? new Error('Job lookup failed') : undefined,
          'JobService',
          { jobId: id, userId: user.id, action: 'DELETE_JOB' },
        );

        throw new NotFoundException(`Job with ID ${id} not found`);
      }

      // 2. Get employer profile for the authenticated user
      if (this.isDev) {
        this.logger.debug('DB Operation - SELECT Employer', 'JobService', {
          operation: 'SELECT',
          table: 'employers',
          userId: user.id,
        });
      }

      const [employer] = await this.db
        .select()
        .from(schema.employers)
        .where(eq(schema.employers.userId, user.id))
        .limit(1);

      if (!employer) {
        // ALWAYS: Error log
        this.logger.error(
          'Employer profile not found',
          this.isDev ? new Error('Employer profile lookup failed') : undefined,
          'JobService',
          { userId: user.id, action: 'DELETE_JOB' },
        );

        throw new BadRequestException('Employer profile not found');
      }

      // 3. Check ownership
      if (this.isDev) {
        this.logger.debug('Ownership Verification', 'JobService', {
          jobEmployerId: job.employerId,
          currentEmployerId: employer.id,
          isOwner: job.employerId === employer.id,
        });
      }

      if (job.employerId !== employer.id) {
        // ALWAYS: Error log
        this.logger.error(
          'Ownership verification failed',
          this.isDev ? new Error('Forbidden - not job owner') : undefined,
          'JobService',
          { jobId: id, userId: user.id, action: 'DELETE_JOB' },
        );

        throw new ForbiddenException('You can only delete your own jobs');
      }

      // 4. Perform delete
      if (this.isDev) {
        this.logger.debug('DB Operation - DELETE Job', 'JobService', {
          operation: 'DELETE',
          table: 'jobs',
          jobId: id,
        });
      }

      const [deletedJob] = await this.db
        .delete(schema.jobs)
        .where(eq(schema.jobs.id, id))
        .returning();

      // DEV-ONLY: Log successful deletion
      if (this.isDev) {
        this.logger.success('Job Deleted Successfully', 'JobService', {
          jobId: deletedJob.id,
          title: deletedJob.title,
        });
      }

      // Remove job from Elasticsearch index (non-blocking)
      this.elasticsearchService.deleteJob(id).catch((err) => {
        // ALWAYS: Error log for Elasticsearch failures
        this.logger.error(
          'Failed to delete job from Elasticsearch',
          this.isDev ? err : undefined,
          'JobService',
          { jobId: id, action: 'ELASTICSEARCH_DELETE' },
        );
      });

      // DEV-ONLY: Log API response
      if (this.isDev) {
        this.logger.debug('API Response - Job Deleted', 'JobService', {
          jobId: deletedJob.id,
          statusCode: 200,
        });
      }

      return {
        message: 'Job deleted successfully',
        ...deletedJob,
      };
    } catch (error) {
      // ALWAYS: Error log (unless already logged above)
      if (
        !(error instanceof NotFoundException) &&
        !(error instanceof BadRequestException) &&
        !(error instanceof ForbiddenException)
      ) {
        this.logger.error(
          'Job deletion failed',
          this.isDev ? error : undefined,
          'JobService',
          { jobId: id, userId: user.id, action: 'DELETE_JOB' },
        );
      }
      throw error;
    }
  }

  async saveJob(jobId: string, user: any) {
    // DEV-ONLY: Log API request received
    if (this.isDev) {
      this.logger.debug('API Request Received - Save Job', 'JobService', {
        jobId,
        userId: user.id,
        userRole: user.role || 'candidate',
      });
    }

    try {
      // 1. Validate that the job exists and is active
      if (this.isDev) {
        this.logger.debug('DB Operation - Check Job Exists', 'JobService', {
          operation: 'SELECT',
          table: 'jobs',
          jobId,
        });
      }

      const job = await this.db.query.jobs.findFirst({
        where: eq(schema.jobs.id, jobId),
      });

      if (!job) {
        // ALWAYS: Error log
        this.logger.error(
          'Job not found',
          this.isDev ? new Error('Job lookup failed') : undefined,
          'JobService',
          { jobId, userId: user.id, action: 'SAVE_JOB' },
        );

        throw new NotFoundException(`Job with ID ${jobId} not found`);
      }

      // DEV-ONLY: Log job validation
      if (this.isDev) {
        this.logger.debug('Job Validation', 'JobService', {
          jobId,
          isActive: job.isActive,
        });
      }

      if (!job.isActive) {
        // ALWAYS: Error log
        this.logger.error(
          'Inactive job cannot be saved',
          this.isDev ? new Error('Job is not active') : undefined,
          'JobService',
          { jobId, userId: user.id, action: 'SAVE_JOB' },
        );

        throw new BadRequestException(
          'This job is no longer active and cannot be saved',
        );
      }

      // 2. Check if user has already applied to this job
      if (this.isDev) {
        this.logger.debug(
          'DB Operation - Check Existing Application',
          'JobService',
          {
            operation: 'SELECT',
            table: 'job_applications',
            jobId,
            userId: user.id,
          },
        );
      }

      const [existingApplication] = await this.db
        .select()
        .from(schema.jobApplications)
        .where(
          and(
            eq(schema.jobApplications.jobId, jobId),
            eq(schema.jobApplications.jobSeekerId, user.id),
          ),
        )
        .limit(1);

      if (existingApplication) {
        // ALWAYS: Error log
        this.logger.error(
          'User already applied to job',
          this.isDev ? new Error('Duplicate application exists') : undefined,
          'JobService',
          { jobId, userId: user.id, action: 'SAVE_JOB' },
        );

        throw new ConflictException(
          'You have already applied to this job. No need to save it.',
        );
      }

      // 3. Check if user has already saved this job
      if (this.isDev) {
        this.logger.debug('DB Operation - Check Existing Save', 'JobService', {
          operation: 'SELECT',
          table: 'saved_jobs',
          jobId,
          userId: user.id,
        });
      }

      const [existingSave] = await this.db
        .select()
        .from(schema.savedJobs)
        .where(
          and(
            eq(schema.savedJobs.jobId, jobId),
            eq(schema.savedJobs.jobSeekerId, user.id),
          ),
        )
        .limit(1);

      if (existingSave) {
        // ALWAYS: Error log
        this.logger.error(
          'Job already saved',
          this.isDev ? new Error('Duplicate save exists') : undefined,
          'JobService',
          { jobId, userId: user.id, action: 'SAVE_JOB' },
        );

        throw new ConflictException('You have already saved this job');
      }

      // 4. Insert saved job record
      if (this.isDev) {
        this.logger.debug('DB Operation - INSERT Saved Job', 'JobService', {
          operation: 'INSERT',
          table: 'saved_jobs',
          jobId,
          userId: user.id,
        });
      }

      const [savedJob] = await this.db
        .insert(schema.savedJobs)
        .values({
          jobId: jobId,
          jobSeekerId: user.id,
        } as any)
        .returning();

      // DEV-ONLY: Log successful save
      if (this.isDev) {
        this.logger.success('Job Saved Successfully', 'JobService', {
          savedJobId: savedJob.id,
          jobId,
          userId: user.id,
        });
      }

      // DEV-ONLY: Log API response
      if (this.isDev) {
        this.logger.debug('API Response - Job Saved', 'JobService', {
          savedJobId: savedJob.id,
          statusCode: 201,
        });
      }

      return {
        message: 'Job saved successfully',
        savedJob,
      };
    } catch (error) {
      // ALWAYS: Error log (unless already logged above)
      if (
        !(error instanceof NotFoundException) &&
        !(error instanceof BadRequestException) &&
        !(error instanceof ConflictException)
      ) {
        this.logger.error(
          'Job save failed',
          this.isDev ? error : undefined,
          'JobService',
          { jobId, userId: user.id, action: 'SAVE_JOB' },
        );
      }
      throw error;
    }
  }

  async getSavedJobs(user: any) {
    // DEV-ONLY: Log API request received
    if (this.isDev) {
      this.logger.debug('API Request Received - Get Saved Jobs', 'JobService', {
        userId: user.id,
        userRole: user.role || 'candidate',
      });
    }

    // DEV-ONLY: Log database operation
    if (this.isDev) {
      this.logger.debug('DB Operation - SELECT Saved Jobs', 'JobService', {
        operation: 'SELECT',
        table: 'saved_jobs',
        userId: user.id,
      });
    }

    // Get all saved jobs for the authenticated candidate with job details
    const savedJobs = await this.db
      .select({
        savedJobId: schema.savedJobs.id,
        savedAt: schema.savedJobs.createdAt,
        job: {
          id: schema.jobs.id,
          title: schema.jobs.title,
          description: schema.jobs.description,
          jobType: schema.jobs.jobType,
          workType: schema.jobs.workType,
          experienceLevel: schema.jobs.experienceLevel,
          location: schema.jobs.location,
          city: schema.jobs.city,
          state: schema.jobs.state,
          salaryMin: schema.jobs.salaryMin,
          salaryMax: schema.jobs.salaryMax,
          payRate: schema.jobs.payRate,
          skills: schema.jobs.skills,
          isActive: schema.jobs.isActive,
          applicationCount: schema.jobs.applicationCount,
          createdAt: schema.jobs.createdAt,
        },
      })
      .from(schema.savedJobs)
      .innerJoin(schema.jobs, eq(schema.savedJobs.jobId, schema.jobs.id))
      .where(eq(schema.savedJobs.jobSeekerId, user.id))
      .orderBy(schema.savedJobs.createdAt);

    // DEV-ONLY: Log API response
    if (this.isDev) {
      this.logger.debug('API Response - Saved Jobs Retrieved', 'JobService', {
        count: savedJobs.length,
        statusCode: 200,
      });
    }

    return {
      message:
        savedJobs.length > 0
          ? 'Saved jobs retrieved successfully'
          : 'No saved jobs found',
      count: savedJobs.length,
      savedJobs,
    };
  }
}
