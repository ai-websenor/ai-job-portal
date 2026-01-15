/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
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
import { RecommendedJobsQueryDto } from './dto/recommended-jobs.dto';
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

    try {
      // 1. Fetch the employer profile using the authenticated userId

      let [employer] = await this.db
        .select()
        .from(schema.employers)
        .where(eq(schema.employers.userId, userId))
        .limit(1);

      // 1.5 Fallback: If not found by ID, try finding by email
      if (!employer && userEmail) {
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

      const {
        applicationDeadline,
        deadline: deadlineAlias,
        ...restJobData
      } = createJobDto;

      // Use deadline if provided, otherwise fall back to applicationDeadline
      const deadline = deadlineAlias || applicationDeadline;

      // Validate employer has company (Phase 1 requirement)
      if (!employer.companyId) {
        // ALWAYS: Error log for blocked job creation
        this.logger.error(
          'Job creation blocked - employer has no company',
          undefined,
          'JobService',
          { employerId: employer.id, userId: user.id },
        );

        throw new BadRequestException(
          'Your employer profile is not linked to a company. ' +
            'Please complete your company profile before creating jobs. ' +
            'Contact support if you need assistance.',
        );
      }

      const jobData = {
        ...restJobData,
        deadline: deadline ? new Date(deadline) : null,
        employerId: employer.id,
        companyId: employer.companyId, // Phase 1: Link job to company

        // ================= DUAL-WRITE STRATEGY WITH FALLBACK (BACKWARD COMPATIBLE) =================
        // Write to new enhanced fields when provided, fallback to legacy
        experienceMin: createJobDto.experienceMin,
        experienceMax: createJobDto.experienceMax,
        employmentType: createJobDto.employmentType ?? createJobDto.jobType,
        engagementType: createJobDto.engagementType ?? createJobDto.workType,
        workMode: Array.isArray(createJobDto.workMode)
          ? createJobDto.workMode[0]
          : createJobDto.workMode || createJobDto.workType || null,
        questions: createJobDto.questions ?? null,

        // Legacy fields: use provided values or fallback from new fields
        jobType: createJobDto.jobType ?? createJobDto.employmentType,
        workType: createJobDto.workType ?? createJobDto.engagementType,
        experienceLevel: createJobDto.experienceLevel, // Keep as-is if provided

        // Additional fields (if provided)
        country: createJobDto.country,
        section: createJobDto.section,
        immigrationStatus: createJobDto.immigrationStatus,
        travelRequirements: createJobDto.travelRequirements,
        qualification: createJobDto.qualification,
        certification: createJobDto.certification,
      };

      // Check for duplicate active job (use jobData values which have fallbacks)
      const duplicateCheckFilters = [
        eq(schema.jobs.employerId, employer.id),
        eq(schema.jobs.title, createJobDto.title),
        eq(schema.jobs.isActive, true),
      ];

      if (jobData.jobType) {
        duplicateCheckFilters.push(eq(schema.jobs.jobType, jobData.jobType));
      }

      if (jobData.experienceLevel) {
        duplicateCheckFilters.push(
          eq(schema.jobs.experienceLevel, jobData.experienceLevel),
        );
      }

      if (createJobDto.city) {
        duplicateCheckFilters.push(eq(schema.jobs.city, createJobDto.city));
      } else {
        duplicateCheckFilters.push(isNull(schema.jobs.city));
      }

      if (createJobDto.state) {
        duplicateCheckFilters.push(eq(schema.jobs.state, createJobDto.state));
      } else {
        duplicateCheckFilters.push(isNull(schema.jobs.state));
      }

      if (jobData.workType) {
        duplicateCheckFilters.push(eq(schema.jobs.workType, jobData.workType));
      }

      const [existingJob] = await this.db
        .select()
        .from(schema.jobs)
        .where(and(...duplicateCheckFilters))
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

      const [job] = await this.db
        .insert(schema.jobs)
        .values(jobData as any)
        .returning();

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

    // Fetch jobs with company name by joining with employers and companies tables
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
        // New enhanced fields (backward compatible)
        experienceMin: schema.jobs.experienceMin,
        experienceMax: schema.jobs.experienceMax,
        employmentType: schema.jobs.employmentType,
        engagementType: schema.jobs.engagementType,
        workMode: schema.jobs.workMode,
        questions: schema.jobs.questions,
        // Phase 2: Company data priority with fallback
        company_name:
          sql<string>`COALESCE(${schema.companies.name}, ${schema.employers.companyName})`.as(
            'company_name',
          ),
        company_id: schema.jobs.companyId,
        company_logo: schema.companies.logoUrl,
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
        // New enhanced fields (backward compatible)
        experienceMin: schema.jobs.experienceMin,
        experienceMax: schema.jobs.experienceMax,
        employmentType: schema.jobs.employmentType,
        engagementType: schema.jobs.engagementType,
        workMode: schema.jobs.workMode,
        questions: schema.jobs.questions,
        // Phase 2: Company data priority with fallback
        company_name:
          sql<string>`COALESCE(${schema.companies.name}, ${schema.employers.companyName})`.as(
            'company_name',
          ),
        company_id: schema.jobs.companyId,
        company_logo: schema.companies.logoUrl,
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
      let needsCompanyJoin = false;

      // Company ID Filter (direct column check, no join needed)
      if (query.companyId) {
        filters.push(eq(schema.jobs.companyId, query.companyId));
      }

      // Company Name Filter (requires join)
      if (query.companyName) {
        needsCompanyJoin = true;
        filters.push(ilike(schema.companies.name, `%${query.companyName}%`));
      }

      // Industry Filter (requires join)
      if (query.industry) {
        needsCompanyJoin = true;
        filters.push(eq(schema.companies.industry, query.industry));
      }

      // Company Type Filter (requires join)
      if (query.companyType) {
        needsCompanyJoin = true;
        filters.push(
          eq(
            schema.companies.companyType,
            query.companyType as 'startup' | 'sme' | 'mnc' | 'government',
          ),
        );
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

      return { filters, needsCompanyJoin };
    };

    // Helper to execute query
    const executeQuery = async (withTimeWindow: boolean) => {
      const { filters, needsCompanyJoin } = buildFilters(withTimeWindow);

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
          // New enhanced fields (backward compatible)
          experienceMin: schema.jobs.experienceMin,
          experienceMax: schema.jobs.experienceMax,
          employmentType: schema.jobs.employmentType,
          engagementType: schema.jobs.engagementType,
          workMode: schema.jobs.workMode,
          questions: schema.jobs.questions,
          // Phase 2: Company data priority with fallback
          company_name:
            sql<string>`COALESCE(${schema.companies.name}, ${schema.employers.companyName})`.as(
              'company_name',
            ),
          company_id: schema.jobs.companyId,
          company_logo: schema.companies.logoUrl,
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
      const { filters, needsCompanyJoin } = buildFilters(withWindow);

      let countBuilder = this.db
        .select({ count: count() })
        .from(schema.jobs)
        .leftJoin(
          schema.companies,
          eq(schema.jobs.companyId, schema.companies.id),
        );

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

      // Company ID Filter (direct column check)
      if (query.companyId) {
        filters.push(eq(schema.jobs.companyId, query.companyId));
      }

      // Company Name Filter (requires companies table)
      if (query.companyName) {
        filters.push(ilike(schema.companies.name, `%${query.companyName}%`));
      }

      // Industry Filter (requires companies table)
      if (query.industry) {
        filters.push(eq(schema.companies.industry, query.industry));
      }

      // Company Type Filter (requires companies table)
      if (query.companyType) {
        filters.push(
          eq(
            schema.companies.companyType,
            query.companyType as 'startup' | 'sme' | 'mnc' | 'government',
          ),
        );
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
        // New enhanced fields (backward compatible)
        experienceMin: schema.jobs.experienceMin,
        experienceMax: schema.jobs.experienceMax,
        employmentType: schema.jobs.employmentType,
        engagementType: schema.jobs.engagementType,
        workMode: schema.jobs.workMode,
        questions: schema.jobs.questions,
        // Phase 2: Company data priority with fallback
        company_name:
          sql<string>`COALESCE(${schema.companies.name}, ${schema.employers.companyName})`.as(
            'company_name',
          ),
        company_id: schema.jobs.companyId,
        company_logo: schema.companies.logoUrl,
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
    let countBuilder = this.db
      .select({ count: count() })
      .from(schema.jobs)
      .leftJoin(
        schema.companies,
        eq(schema.jobs.companyId, schema.companies.id),
      );

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
        // Phase 2: Company data priority with fallback
        company_name:
          sql<string>`COALESCE(${schema.companies.name}, ${schema.employers.companyName})`.as(
            'company_name',
          ),
        company_id: schema.jobs.companyId,
        company_logo: schema.companies.logoUrl,
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

  /**
   * Get recommended jobs for a candidate based on behavior and intent.
   *
   * DIFFERENCE FROM getRelevantJobs:
   * - Relevant Jobs = preference match only (static)
   * - Recommended Jobs = behavior + intent + preferences (dynamic)
   *
   * This method uses:
   * - Job applications (what they applied to)
   * - Saved searches (what they're actively looking for)
   * - Job preferences (what they want)
   *
   * Fallback: If no signals exist, returns trending jobs for better UX.
   *
   * Safety: Pre-limited to 500 jobs before in-memory scoring to prevent memory issues.
   */
  async getRecommendedJobs(query: RecommendedJobsQueryDto, user: any) {
    const limit = query.limit || 10;
    const offset = ((query.page || 1) - 1) * limit;

    // Helper: Normalize strings for consistent comparison
    const normalize = (value: string | null | undefined): string => {
      return (value || '').toLowerCase().trim();
    };

    // Step 1: Fetch candidate profile
    const [profile] = await this.db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, user.id))
      .limit(1);

    // Step 2: Fetch applied jobs to extract behavior signals
    const appliedJobs = await this.db
      .select({
        jobId: schema.jobApplications.jobId,
        jobType: schema.jobs.jobType,
        categoryId: schema.jobs.categoryId,
        city: schema.jobs.city,
        state: schema.jobs.state,
        industry: schema.companies.industry,
      })
      .from(schema.jobApplications)
      .innerJoin(schema.jobs, eq(schema.jobApplications.jobId, schema.jobs.id))
      .leftJoin(
        schema.companies,
        eq(schema.jobs.companyId, schema.companies.id),
      )
      .where(eq(schema.jobApplications.jobSeekerId, user.id));

    // Extract signals from applied jobs
    const appliedJobIds = appliedJobs.map((j) => j.jobId);
    const appliedJobTypes = [
      ...new Set(appliedJobs.map((j) => normalize(j.jobType)).filter(Boolean)),
    ];
    const appliedCategories = [
      ...new Set(appliedJobs.map((j) => j.categoryId).filter(Boolean)),
    ];
    const appliedLocations = [
      ...new Set(
        appliedJobs
          .flatMap((j) => [normalize(j.city), normalize(j.state)])
          .filter(Boolean),
      ),
    ];
    const appliedIndustries = [
      ...new Set(appliedJobs.map((j) => normalize(j.industry)).filter(Boolean)),
    ];

    // Step 3a: Fetch saved jobs to extract strong interest signals
    const savedJobs = await this.db
      .select({
        jobId: schema.savedJobs.jobId,
        jobType: schema.jobs.jobType,
        categoryId: schema.jobs.categoryId,
        city: schema.jobs.city,
        state: schema.jobs.state,
        industry: schema.companies.industry,
      })
      .from(schema.savedJobs)
      .innerJoin(schema.jobs, eq(schema.savedJobs.jobId, schema.jobs.id))
      .leftJoin(
        schema.companies,
        eq(schema.jobs.companyId, schema.companies.id),
      )
      .where(eq(schema.savedJobs.jobSeekerId, user.id));

    // Extract signals from saved jobs
    const savedJobTypes = [
      ...new Set(savedJobs.map((j) => normalize(j.jobType)).filter(Boolean)),
    ];
    const savedCategories = [
      ...new Set(savedJobs.map((j) => j.categoryId).filter(Boolean)),
    ];
    const savedLocations = [
      ...new Set(
        savedJobs
          .flatMap((j) => [normalize(j.city), normalize(j.state)])
          .filter(Boolean),
      ),
    ];
    const savedIndustries = [
      ...new Set(savedJobs.map((j) => normalize(j.industry)).filter(Boolean)),
    ];

    // Step 3b: Fetch saved searches
    const savedSearches = await this.db
      .select()
      .from(schema.savedSearches)
      .where(
        and(
          eq(schema.savedSearches.userId, user.id),
          eq(schema.savedSearches.isActive, true),
        ),
      );

    // Parse saved search criteria
    const savedSearchCriteria = savedSearches
      .map((s) => {
        try {
          return JSON.parse(s.searchCriteria);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // Step 4: Fetch job preferences (optional)
    const [preferences] = profile
      ? await this.db
          .select()
          .from(schema.jobPreferences)
          .where(eq(schema.jobPreferences.profileId, profile.id))
          .limit(1)
      : [null];

    // Parse preference arrays
    let preferredJobTypes: string[] = [];
    let preferredLocations: string[] = [];
    let preferredIndustries: string[] = [];

    if (preferences) {
      try {
        if (preferences.jobTypes) {
          const parsed = JSON.parse(preferences.jobTypes);
          preferredJobTypes = Array.isArray(parsed)
            ? parsed.map((t) => normalize(t))
            : [];
        }
      } catch {
        preferredJobTypes = [];
      }

      try {
        if (preferences.preferredLocations) {
          const parsed = JSON.parse(preferences.preferredLocations);
          preferredLocations = Array.isArray(parsed)
            ? parsed.map((l) => normalize(l))
            : [];
        }
      } catch {
        preferredLocations = [];
      }

      try {
        if (preferences.preferredIndustries) {
          const parsed = JSON.parse(preferences.preferredIndustries);
          preferredIndustries = Array.isArray(parsed)
            ? parsed.map((i) => normalize(i))
            : [];
        }
      } catch {
        preferredIndustries = [];
      }
    }

    // Step 5: Empty-signal fallback
    const hasSignals =
      appliedJobs.length > 0 ||
      savedJobs.length > 0 ||
      savedSearches.length > 0 ||
      (preferences &&
        (preferredJobTypes.length > 0 ||
          preferredLocations.length > 0 ||
          preferredIndustries.length > 0));

    if (!hasSignals) {
      // Fallback to trending jobs for better UX
      return this.getTrendingJobs(query);
    }

    // Step 6: Build base filters
    const baseFilters = [eq(schema.jobs.isActive, true)];

    // Exclude deadline-passed jobs
    const deadlineFilter = or(
      isNull(schema.jobs.deadline),
      gt(schema.jobs.deadline, new Date()),
    );
    if (deadlineFilter) {
      baseFilters.push(deadlineFilter);
    }

    // Exclude already-applied jobs
    if (appliedJobIds.length > 0) {
      baseFilters.push(
        sql`${schema.jobs.id} NOT IN (${sql.join(
          appliedJobIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      );
    }

    // Step 7: Fetch eligible jobs with safety cap (500 jobs max)
    const eligibleJobs = await this.db
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
        categoryId: schema.jobs.categoryId,
        trendingScore: schema.jobs.trendingScore,
        popularityScore: schema.jobs.popularityScore,
        // Phase 2: Company data priority with fallback
        company_name:
          sql<string>`COALESCE(${schema.companies.name}, ${schema.employers.companyName})`.as(
            'company_name',
          ),
        company_id: schema.jobs.companyId,
        company_logo: schema.companies.logoUrl,
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
      .where(and(...baseFilters))
      .orderBy(desc(schema.jobs.createdAt))
      .limit(500); // Safety cap for in-memory scoring

    // Step 8: Deduplication (explicit, though SQL likely already handles this)
    const uniqueJobs = new Map();
    eligibleJobs.forEach((job) => {
      if (!uniqueJobs.has(job.id)) {
        uniqueJobs.set(job.id, job);
      }
    });

    // Step 9: Calculate recommendation scores
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const jobsWithScores = Array.from(uniqueJobs.values()).map((job) => {
      let score = 0;

      // +30: Matches saved search criteria
      for (const criteria of savedSearchCriteria) {
        let matches = false;

        // Match keywords in title/description
        if (criteria.keyword) {
          const keyword = normalize(criteria.keyword);
          if (
            normalize(job.title).includes(keyword) ||
            normalize(job.description).includes(keyword)
          ) {
            matches = true;
          }
        }

        // Match job types
        if (criteria.jobTypes && Array.isArray(criteria.jobTypes)) {
          const searchJobTypes = criteria.jobTypes.map((t: string) =>
            normalize(t),
          );
          if (searchJobTypes.includes(normalize(job.jobType))) {
            matches = true;
          }
        }

        // Match locations
        if (criteria.locations && Array.isArray(criteria.locations)) {
          const searchLocations = criteria.locations.map((l: string) =>
            normalize(l),
          );
          if (
            searchLocations.includes(normalize(job.city)) ||
            searchLocations.includes(normalize(job.state))
          ) {
            matches = true;
          }
        }

        if (matches) {
          score += 30;
          break; // Only count once even if multiple saved searches match
        }
      }

      // +25: Matches job preferences
      let preferencesMatch = false;
      if (preferredJobTypes.includes(normalize(job.jobType))) {
        preferencesMatch = true;
      }
      if (
        preferredLocations.includes(normalize(job.city)) ||
        preferredLocations.includes(normalize(job.state))
      ) {
        preferencesMatch = true;
      }
      if (
        job.company_industry &&
        preferredIndustries.includes(normalize(job.company_industry))
      ) {
        preferencesMatch = true;
      }
      if (preferencesMatch) {
        score += 25;
      }

      // +20: Matches category of applied jobs
      if (job.categoryId && appliedCategories.includes(job.categoryId)) {
        score += 20;
      }

      // +20: Matches category of saved jobs
      if (job.categoryId && savedCategories.includes(job.categoryId)) {
        score += 20;
      }

      // +15: Matches job type of applied jobs
      if (appliedJobTypes.includes(normalize(job.jobType))) {
        score += 15;
      }

      // +15: Matches job type of saved jobs
      if (savedJobTypes.includes(normalize(job.jobType))) {
        score += 15;
      }

      // +10: Matches location from profile or applied jobs
      const profileCity = profile ? normalize(profile.city) : '';
      const profileState = profile ? normalize(profile.state) : '';
      if (
        (profileCity && normalize(job.city) === profileCity) ||
        (profileState && normalize(job.state) === profileState) ||
        appliedLocations.includes(normalize(job.city)) ||
        appliedLocations.includes(normalize(job.state))
      ) {
        score += 10;
      }

      // +10: Matches location of saved jobs
      if (
        savedLocations.includes(normalize(job.city)) ||
        savedLocations.includes(normalize(job.state))
      ) {
        score += 10;
      }

      // +10: Matches industry of applied jobs
      if (
        job.company_industry &&
        appliedIndustries.includes(normalize(job.company_industry))
      ) {
        score += 10;
      }

      // +10: Matches industry of saved jobs
      if (
        job.company_industry &&
        savedIndustries.includes(normalize(job.company_industry))
      ) {
        score += 10;
      }

      // +5: Has trending score
      if (job.trendingScore && job.trendingScore > 0) {
        score += 5;
      }

      // +5: Has popularity score
      if (job.popularityScore && job.popularityScore > 0) {
        score += 5;
      }

      // +5: Freshness bias (created within last 7 days)
      if (new Date(job.createdAt) > sevenDaysAgo) {
        score += 5;
      }

      // Score capping: Max 100
      score = Math.min(score, 100);

      return { ...job, recommendation_score: score };
    });

    // Step 10: Sort by recommendation score, then by activity
    jobsWithScores.sort((a, b) => {
      if (b.recommendation_score !== a.recommendation_score) {
        return b.recommendation_score - a.recommendation_score;
      }
      if (a.lastActivityAt && b.lastActivityAt) {
        return (
          new Date(b.lastActivityAt).getTime() -
          new Date(a.lastActivityAt).getTime()
        );
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Step 11: Apply pagination
    const paginatedJobs = jobsWithScores.slice(offset, offset + limit);

    // Step 12: Strip internal fields
    const finalJobs = paginatedJobs.map(
      ({
        recommendation_score,
        company_industry,
        categoryId,
        trendingScore,
        popularityScore,
        ...job
      }) => job,
    );

    // Step 13: Return response
    return {
      data: finalJobs,
      pagination: {
        page: query.page || 1,
        limit,
        total: jobsWithScores.length,
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
        // Phase 2: Company data priority with fallback
        company_name:
          sql<string>`COALESCE(${schema.companies.name}, ${schema.employers.companyName})`.as(
            'company_name',
          ),
        company_id: schema.jobs.companyId,
        company_logo: schema.companies.logoUrl,
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
        // Phase 2: Company data priority with fallback
        company_name:
          sql<string>`COALESCE(${schema.companies.name}, ${schema.employers.companyName})`.as(
            'company_name',
          ),
        company_id: schema.jobs.companyId,
        company_logo: schema.companies.logoUrl,
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
      const {
        applicationDeadline,
        deadline: deadlineAlias,
        workMode,
        questions,
        ...restUpdateData
      } = updateJobDto;

      // Use deadline if provided, otherwise fall back to applicationDeadline
      const deadline = deadlineAlias || applicationDeadline;

      const updateData = {
        ...restUpdateData,
        ...(deadline && { deadline: new Date(deadline) }),
        ...(workMode && {
          workMode: Array.isArray(workMode) ? workMode[0] : workMode,
        }),
        ...(questions && {
          questions: questions,
        }),
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
          // Phase 2: Company data priority with fallback
          company_name:
            sql<string>`COALESCE(${schema.companies.name}, ${schema.employers.companyName})`.as(
              'company_name',
            ),
          company_id: schema.jobs.companyId,
          company_logo: schema.companies.logoUrl,
          company_industry: schema.companies.industry,
        },
      })
      .from(schema.savedJobs)
      .innerJoin(schema.jobs, eq(schema.savedJobs.jobId, schema.jobs.id))
      .innerJoin(
        schema.employers,
        eq(schema.jobs.employerId, schema.employers.id),
      )
      .leftJoin(
        schema.companies,
        eq(schema.jobs.companyId, schema.companies.id),
      )
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
