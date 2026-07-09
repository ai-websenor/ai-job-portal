import { Injectable, Inject, ForbiddenException, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql, inArray, ilike, or, gte, lte } from 'drizzle-orm';
import {
  Database,
  jobApplications,
  jobs,
  profiles,
  employers,
  companies,
} from '@ai-job-portal/database';
import { S3Service } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import {
  CandidateApplicationsQueryDto,
  EmployerApplicationsQueryDto,
  EmployerJobsSummaryQueryDto,
  EmployerJobApplicantsQueryDto,
} from './dto';
import { PaginationDto, hasCompanyPermission } from '@ai-job-portal/common';
import { employerPublicColumns, jobSeekerPublicColumns } from './application-columns.const';
import { ApplicationEnrichmentHelper } from './application-enrichment.helper';

@Injectable()
export class ApplicationQueryService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly s3Service: S3Service,
    private readonly enrichmentHelper: ApplicationEnrichmentHelper,
  ) {}

  async getCandidateApplications(userId: string, query: CandidateApplicationsQueryDto) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const offset = (page - 1) * limit;

    // Resolve job IDs when search is provided (matches job title OR company name)
    let filteredJobIds: string[] | null = null;
    if (query.search) {
      const term = `%${query.search}%`;

      // Jobs matching by title
      const jobsByTitle = await this.db.query.jobs.findMany({
        where: ilike(jobs.title, term),
        columns: { id: true },
      });

      // Jobs matching by company name
      const matchingCompanies = await this.db.query.companies.findMany({
        where: ilike(companies.name, term),
        columns: { id: true },
      });
      const companyIds = matchingCompanies.map((c) => c.id);
      const jobsByCompany =
        companyIds.length > 0
          ? await this.db.query.jobs.findMany({
              where: inArray(jobs.companyId, companyIds),
              columns: { id: true },
            })
          : [];

      filteredJobIds = [
        ...new Set([...jobsByTitle.map((j) => j.id), ...jobsByCompany.map((j) => j.id)]),
      ];
      if (filteredJobIds.length === 0) {
        return {
          data: [],
          pagination: { totalApplications: 0, pageCount: 0, currentPage: page, hasNextPage: false },
        };
      }
    }

    // Build where conditions
    let conditions: any = eq(jobApplications.jobSeekerId, userId);
    if (query.status) {
      conditions = and(conditions, eq(jobApplications.status, query.status as any));
    }
    if (filteredJobIds) {
      conditions = and(conditions, inArray(jobApplications.jobId, filteredJobIds));
    }

    const [data, countResult] = await Promise.all([
      this.db.query.jobApplications.findMany({
        where: conditions,
        with: {
          job: {
            with: {
              employer: { columns: employerPublicColumns },
              company: {
                columns: {
                  id: true,
                  name: true,
                  logoUrl: true,
                },
              },
            },
          },
          interviews: true,
        },
        orderBy: [desc(jobApplications.appliedAt)],
        limit,
        offset,
      }),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(jobApplications)
        .where(conditions),
    ]);

    // Batch lookup threadIds + compute reapplyDaysLeft for withdrawn applications
    const now = Date.now();
    const enrichedData = await Promise.all(
      data.map(async (app: any) => {
        const employerUserId = app.job?.employer?.userId;
        const threadId = employerUserId
          ? await this.enrichmentHelper.getThreadId(userId, employerUserId, app.id)
          : null;

        let reapplyDaysLeft: number | null = null;
        if (app.status === 'withdrawn' && app.updatedAt) {
          const reapplyDate = new Date(app.updatedAt);
          reapplyDate.setDate(reapplyDate.getDate() + 60);
          const daysLeft = Math.ceil((reapplyDate.getTime() - now) / (1000 * 60 * 60 * 24));
          reapplyDaysLeft = daysLeft > 0 ? daysLeft : 0;
        }

        return { ...app, threadId, reapplyDaysLeft };
      }),
    );

    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);

    return {
      data: enrichedData,
      pagination: {
        totalApplications: total,
        pageCount: totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
      },
    };
  }

  async getJobApplications(userId: string, jobId: string, query: PaginationDto, userRole?: string) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    // Direct ownership check
    let job = await this.db.query.jobs.findFirst({
      where: and(eq(jobs.id, jobId), eq(jobs.employerId, employer.id)),
    });

    // Company-level access fallback
    if (!job && userRole && employer.companyId) {
      const companyJob = await this.db.query.jobs.findFirst({
        where: and(eq(jobs.id, jobId), eq(jobs.companyId, employer.companyId)),
      });
      if (companyJob) {
        const hasPermission = await hasCompanyPermission(
          this.db,
          employer.rbacRoleId,
          userRole,
          'company-applications:read',
        );
        if (hasPermission) job = companyJob;
      }
    }

    if (!job) throw new NotFoundException('Job not found');

    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const offset = (page - 1) * limit;

    const [applications, countResult] = await Promise.all([
      this.db.query.jobApplications.findMany({
        where: eq(jobApplications.jobId, jobId),
        with: {
          jobSeeker: { columns: jobSeekerPublicColumns },
          interviews: true,
        },
        orderBy: [desc(jobApplications.appliedAt)],
        limit,
        offset,
      }),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(jobApplications)
        .where(eq(jobApplications.jobId, jobId)),
    ]);

    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);

    // Fetch candidate profile photos
    const candidateIds = [...new Set(applications.map((a) => a.jobSeekerId))];

    let candidateProfiles: any[] = [];
    if (candidateIds.length > 0) {
      candidateProfiles = await this.db.query.profiles.findMany({
        where: inArray(profiles.userId, candidateIds),
        columns: {
          userId: true,
          profilePhoto: true,
        },
      });
    }

    const profileMap = new Map(candidateProfiles.map((p) => [p.userId, p]));

    const data = await Promise.all(
      applications.map(async (app) => {
        const candidateProfile = profileMap.get(app.jobSeekerId);

        const profilePhotoUrl = await this.s3Service.getSignedDownloadUrlFromKeyOrUrl(
          candidateProfile?.profilePhoto || null,
        );

        return {
          ...app,
          candidateProfilePhoto: profilePhotoUrl,
        };
      }),
    );

    return {
      data,
      pagination: {
        totalApplications: total,
        pageCount: totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
      },
    };
  }

  /**
   * Get all applications for all jobs owned by the employer
   * Supports optional filtering by job name (case-insensitive, partial match)
   * When scope=company, shows applications for all company jobs (requires company-applications:read)
   */
  async getAllEmployerApplications(
    userId: string,
    query: EmployerApplicationsQueryDto,
    userRole?: string,
    _scope?: string,
  ) {
    // Step 1: Find employer record for this user
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    // Step 2: Get jobs — auto-detect company-level access
    let jobFilter: any = eq(jobs.employerId, employer.id);

    if (employer.companyId && userRole) {
      const hasPermission = await hasCompanyPermission(
        this.db,
        employer.rbacRoleId,
        userRole,
        'company-applications:read',
      );
      if (hasPermission) {
        jobFilter = eq(jobs.companyId, employer.companyId);
      }
    }

    const employerJobs = await this.db.query.jobs.findMany({
      where: jobFilter,
      columns: { id: true, title: true },
    });

    if (employerJobs.length === 0) {
      return {
        data: [],
        pagination: {
          totalApplications: 0,
          pageCount: 0,
          currentPage: Number(query.page || 1),
          hasNextPage: false,
        },
      };
    }

    const jobIds = employerJobs.map((j) => j.id);
    const jobMap = new Map(employerJobs.map((j) => [j.id, j.title]));

    // Step 3: Pagination setup
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const offset = (page - 1) * limit;

    // Step 4: Build application filter conditions
    let applicationConditions: any = inArray(jobApplications.jobId, jobIds);

    // Apply status filter if provided
    if (query.status) {
      applicationConditions = and(
        applicationConditions,
        eq(jobApplications.status, query.status as any),
      );
    }

    // Apply applied-date range filter (inclusive)
    if (query.fromDate) {
      applicationConditions = and(
        applicationConditions,
        gte(jobApplications.appliedAt, new Date(query.fromDate)),
      );
    }
    if (query.toDate) {
      applicationConditions = and(
        applicationConditions,
        lte(jobApplications.appliedAt, new Date(query.toDate)),
      );
    }

    // Apply search filter — matches job title OR candidate name
    if (query.search) {
      const term = `%${query.search}%`;

      // Job IDs matching the search term by title
      const matchingJobIds = employerJobs
        .filter((j) => j.title.toLowerCase().includes(query.search!.toLowerCase()))
        .map((j) => j.id);

      // Candidate user IDs matching the search term by name
      const matchingProfiles = await this.db.query.profiles.findMany({
        where: or(ilike(profiles.firstName, term), ilike(profiles.lastName, term)),
        columns: { userId: true },
      });
      const matchingCandidateIds = matchingProfiles.map((p) => p.userId);

      if (matchingJobIds.length === 0 && matchingCandidateIds.length === 0) {
        return {
          data: [],
          pagination: {
            totalApplications: 0,
            pageCount: 0,
            currentPage: page,
            hasNextPage: false,
          },
        };
      }

      const searchConditions: any[] = [];
      if (matchingJobIds.length > 0) {
        searchConditions.push(inArray(jobApplications.jobId, matchingJobIds));
      }
      if (matchingCandidateIds.length > 0) {
        searchConditions.push(inArray(jobApplications.jobSeekerId, matchingCandidateIds));
      }
      applicationConditions = and(
        applicationConditions,
        searchConditions.length === 1 ? searchConditions[0] : or(...searchConditions),
      );
    }

    // Fetch applications for these jobs + total count for pagination in parallel
    const [applications, countResult] = await Promise.all([
      this.db.query.jobApplications.findMany({
        where: applicationConditions,
        orderBy: [desc(jobApplications.appliedAt)],
        limit,
        offset,
      }),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(jobApplications)
        .where(applicationConditions),
    ]);

    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);

    // Step 6: Fetch candidate profiles for these applications
    const candidateIds = [...new Set(applications.map((a) => a.jobSeekerId))];

    let candidateProfiles: any[] = [];
    if (candidateIds.length > 0) {
      candidateProfiles = await this.db.query.profiles.findMany({
        where: inArray(profiles.userId, candidateIds),
        columns: {
          userId: true,
          firstName: true,
          lastName: true,
          profilePhoto: true,
        },
      });
    }

    const profileMap = new Map(candidateProfiles.map((p) => [p.userId, p]));

    // Step 7: Build response with minimal candidate info
    const data = await Promise.all(
      applications.map(async (app) => {
        const candidateProfile = profileMap.get(app.jobSeekerId);

        // Get pre-signed download URL for profile photo if exists
        const profilePhotoUrl = await this.s3Service.getSignedDownloadUrlFromKeyOrUrl(
          candidateProfile?.profilePhoto || null,
        );

        return {
          applicationId: app.id,
          jobId: app.jobId,
          jobTitle: jobMap.get(app.jobId) || null,
          candidateId: app.jobSeekerId,
          candidateName: candidateProfile
            ? `${candidateProfile.firstName || ''} ${candidateProfile.lastName || ''}`.trim() ||
              null
            : null,
          candidateProfilePhoto: profilePhotoUrl,
          status: app.status,
          appliedAt: app.appliedAt,
          resumeUrl: app.resumeUrl,
        };
      }),
    );

    return {
      data,
      pagination: {
        totalApplications: total,
        pageCount: totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
      },
    };
  }

  /**
   * Get applicants for a specific employer job
   * Lightweight list for applicants view (not full profile)
   */
  async getEmployerJobApplicants(
    userId: string,
    query: EmployerJobApplicantsQueryDto,
    userRole?: string,
  ) {
    // Step 1: Find employer record for this user
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    // Step 2: Verify job exists and belongs to this employer (or company)
    let job = await this.db.query.jobs.findFirst({
      where: and(eq(jobs.id, query.jobId), eq(jobs.employerId, employer.id)),
    });

    // Company-level access fallback
    if (!job && userRole && employer.companyId) {
      const companyJob = await this.db.query.jobs.findFirst({
        where: and(eq(jobs.id, query.jobId), eq(jobs.companyId, employer.companyId)),
      });
      if (companyJob) {
        const hasPermission = await hasCompanyPermission(
          this.db,
          employer.rbacRoleId,
          userRole,
          'company-applications:read',
        );
        if (hasPermission) job = companyJob;
      }
    }

    if (!job) throw new ForbiddenException('Job not found or access denied');

    // Step 3: Pagination setup
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const offset = (page - 1) * limit;

    // Step 4/5: Fetch applications for this job + total count in parallel
    const [applications, countResult] = await Promise.all([
      this.db.query.jobApplications.findMany({
        where: eq(jobApplications.jobId, query.jobId),
        orderBy: [desc(jobApplications.appliedAt)],
        limit,
        offset,
      }),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(jobApplications)
        .where(eq(jobApplications.jobId, query.jobId)),
    ]);

    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);

    if (applications.length === 0) {
      return {
        data: [],
        pagination: {
          totalApplicants: 0,
          pageCount: 0,
          currentPage: page,
          hasNextPage: false,
        },
      };
    }

    // Step 6: Fetch candidate profiles for these applications
    const candidateIds = applications.map((a) => a.jobSeekerId);

    let candidateProfiles: any[] = [];
    if (candidateIds.length > 0) {
      candidateProfiles = await this.db.query.profiles.findMany({
        where: inArray(profiles.userId, candidateIds),
        columns: {
          userId: true,
          firstName: true,
          lastName: true,
          profilePhoto: true,
        },
      });
    }

    const profileMap = new Map(candidateProfiles.map((p) => [p.userId, p]));

    // Step 7: Apply search filter on candidate name if provided
    let filteredApplications = applications;
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filteredApplications = applications.filter((app) => {
        const profile = profileMap.get(app.jobSeekerId);
        if (!profile) return false;
        const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.toLowerCase();
        return fullName.includes(searchLower);
      });
    }

    // Step 8: Build response with minimal applicant info
    const data = await Promise.all(
      filteredApplications.map(async (app) => {
        const candidateProfile = profileMap.get(app.jobSeekerId);

        // Get pre-signed download URL for profile photo if exists
        const profilePhotoUrl = await this.s3Service.getSignedDownloadUrlFromKeyOrUrl(
          candidateProfile?.profilePhoto || null,
        );

        return {
          applicationId: app.id,
          candidateId: app.jobSeekerId,
          candidateName: candidateProfile
            ? `${candidateProfile.firstName || ''} ${candidateProfile.lastName || ''}`.trim() ||
              null
            : null,
          candidateProfilePhoto: profilePhotoUrl,
          appliedAt: app.appliedAt,
          jobId: app.jobId,
        };
      }),
    );

    return {
      data,
      pagination: {
        totalApplicants: query.search ? filteredApplications.length : total,
        pageCount: query.search ? Math.ceil(filteredApplications.length / limit) : totalPages,
        currentPage: page,
        hasNextPage: query.search ? filteredApplications.length > page * limit : page < totalPages,
      },
    };
  }

  /**
   * Get employer jobs summary with application counts
   * Groups applications by job for dashboard view
   */
  async getEmployerApplicationsSummary(
    userId: string,
    query: EmployerJobsSummaryQueryDto,
    userRole?: string,
    _scope?: string,
  ) {
    // Step 1: Find employer record with company info
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
      with: { company: true },
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    // Step 2: Build job filter — auto-detect company-level access
    let baseFilter: any = eq(jobs.employerId, employer.id);

    if (employer.companyId && userRole) {
      const hasPermission = await hasCompanyPermission(
        this.db,
        employer.rbacRoleId,
        userRole,
        'company-applications:read',
      );
      if (hasPermission) {
        baseFilter = eq(jobs.companyId, employer.companyId);
      }
    }

    let jobConditions = baseFilter;

    // Apply job name filter if provided (case-insensitive, partial match)
    if (query.jobName) {
      jobConditions = and(jobConditions, ilike(jobs.title, `%${query.jobName}%`)) as any;
    }

    // Step 3: Pagination setup
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const offset = (page - 1) * limit;

    // Step 4: Get total count for pagination
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(jobConditions);

    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);

    if (total === 0) {
      return {
        data: [],
        pagination: {
          totalJobs: 0,
          pageCount: 0,
          currentPage: page,
          hasNextPage: false,
        },
      };
    }

    // Step 5: Fetch jobs with pagination
    const employerJobs = await this.db.query.jobs.findMany({
      where: jobConditions,
      orderBy: [desc(jobs.createdAt)],
      limit,
      offset,
    });

    // Step 6: Get company logo public URL if exists
    const company = (employer as any).company;
    const companyLogoUrl = this.s3Service.getPublicUrlFromKeyOrUrl(company?.logoUrl || null);

    // Step 7: Build response with job summaries
    const data = employerJobs.map((job) => {
      // Calculate remaining days from deadline
      let remainingDays: number | null = null;
      let remainingText: string | null = null;

      if (job.deadline) {
        const now = new Date();
        const deadline = new Date(job.deadline);
        const diffTime = deadline.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
          remainingDays = diffDays;
          // Format as "Xmon Yw Remaining" for UI
          const months = Math.floor(diffDays / 30);
          const weeks = Math.floor((diffDays % 30) / 7);
          const days = diffDays % 7;

          if (months > 0 && weeks > 0) {
            remainingText = `${months}mon ${weeks}w Remaining`;
          } else if (months > 0) {
            remainingText = `${months}mon Remaining`;
          } else if (weeks > 0 && days > 0) {
            remainingText = `${weeks}w ${days}d Remaining`;
          } else if (weeks > 0) {
            remainingText = `${weeks}w Remaining`;
          } else {
            remainingText = `${days}d Remaining`;
          }
        } else {
          remainingDays = 0;
          remainingText = 'Expired';
        }
      }

      return {
        jobId: job.id,
        jobTitle: job.title,
        companyName: company?.name || null,
        companyLogo: companyLogoUrl,
        location: job.location,
        jobType: job.jobType,
        applicantCount: job.applicationCount || 0,
        remainingDays,
        remainingText,
        deadline: job.deadline,
        isActive: job.isActive,
        createdAt: job.createdAt,
      };
    });

    return {
      data,
      pagination: {
        totalJobs: total,
        pageCount: totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
      },
    };
  }
}
