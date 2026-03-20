import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CustomLogger } from '@ai-job-portal/logger';
import { eq, and, desc, sql, inArray, ilike, or, gt } from 'drizzle-orm';
import {
  Database,
  jobApplications,
  applicationHistory,
  applicantNotes,
  jobs,
  profiles,
  profileViews,
  employers,
  companies,
  resumes,
  messageThreads,
  interviews,
} from '@ai-job-portal/database';
import { SqsService, S3Service } from '@ai-job-portal/aws';
import { ConfigService } from '@nestjs/config';
import { DATABASE_CLIENT } from '../database/database.module';
import {
  ApplyJobDto,
  UpdateApplicationStatusDto,
  QuickApplyDto,
  CandidateApplicationsQueryDto,
  EmployerApplicationsQueryDto,
  EmployerJobsSummaryQueryDto,
  EmployerJobApplicantsQueryDto,
} from './dto';
import { PaginationDto, hasCompanyPermission } from '@ai-job-portal/common';
import { SubscriptionHelper } from '../subscription/subscription.helper';

@Injectable()
export class ApplicationService {
  private readonly logger = new CustomLogger();

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly sqsService: SqsService,
    private readonly s3Service: S3Service,
    private readonly subscriptionHelper: SubscriptionHelper,
    private readonly configService: ConfigService,
  ) {}

  private updateRecommendationCache(userId: string, jobId: string): void {
    const baseUrl =
      this.configService.get<string>('RECOMMENDATION_SERVICE_URL') || 'http://localhost:3009';
    fetch(`${baseUrl}/recommendations/jobs/internal/update-cache`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, jobId, updates: { isApplied: true } }),
    }).catch((err) =>
      this.logger.error(
        `Failed to update recommendation cache: ${err.message}`,
        'ApplicationService',
      ),
    );
  }

  async apply(userId: string, dto: ApplyJobDto) {
    // Get candidate profile for name display
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new ForbiddenException('Candidate profile required');

    // Check job exists and is active
    const job = (await this.db.query.jobs.findFirst({
      where: and(eq(jobs.id, dto.jobId), eq(jobs.isActive, true)),
      with: { employer: true },
    })) as any;
    if (!job) throw new NotFoundException('Job not found or not active');

    // Check not already applied
    const existing = await this.db.query.jobApplications.findFirst({
      where: and(eq(jobApplications.jobId, dto.jobId), eq(jobApplications.jobSeekerId, userId)),
    });
    if (existing) throw new ConflictException('Already applied to this job');

    if (dto.agreeConsent !== true) {
      throw new BadRequestException('You must agree to the consent before applying for this job');
    }

    // Resolve resume URL and snapshot from resumeId if provided
    let resumeUrl = dto.resumeUrl;
    let resumeSnapshot = null;

    if (dto.resumeId) {
      const resume = await this.db.query.resumes.findFirst({
        where: and(eq(resumes.id, dto.resumeId), eq(resumes.profileId, profile.id)),
      });
      if (!resume) {
        throw new BadRequestException('Resume not found or does not belong to you');
      }
      resumeUrl = resume.filePath;

      // Create resume snapshot from profile data
      resumeSnapshot = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        headline: profile.headline,
        professionalSummary: profile.professionalSummary,
        totalExperienceYears: profile.totalExperienceYears,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        resumeUrl: resume.filePath,
        snapshotAt: new Date().toISOString(),
      };
    }

    // Create application
    const [application] = await this.db
      .insert(jobApplications)
      .values({
        jobId: dto.jobId,
        jobSeekerId: userId,
        resumeUrl,
        resumeSnapshot,
        coverLetter: dto.coverLetter,
        screeningAnswers: dto.answers,
        status: 'applied',
        agreeConsent: dto.agreeConsent,
        companyId: job.companyId || null,
      })
      .returning();

    // Update job application count
    await this.db
      .update(jobs)
      .set({ applicationCount: sql`${jobs.applicationCount} + 1` })
      .where(eq(jobs.id, dto.jobId));

    // Send notification to employer (non-blocking)
    this.sqsService
      .sendNewApplicationNotification({
        employerId: job.employer?.userId,
        applicationId: application.id,
        jobTitle: job.title,
        candidateName: `${profile.firstName} ${profile.lastName}`,
      })
      .catch((err) =>
        this.logger.error(`Failed to send notification: ${err.message}`, 'ApplicationService'),
      );

    // Send confirmation to candidate (non-blocking)
    this.getCompanyName(job.employer?.companyId).then((companyName) => {
      this.sqsService
        .sendApplicationReceivedCandidateNotification({
          userId,
          email: profile.email || '',
          candidateName: `${profile.firstName} ${profile.lastName}`,
          applicationId: application.id,
          jobTitle: job.title,
          companyName,
        })
        .catch((err) =>
          this.logger.error(`Failed to send notification: ${err.message}`, 'ApplicationService'),
        );
    });

    // Update isApplied flag in recommendation cache (non-blocking)
    this.updateRecommendationCache(userId, dto.jobId);

    return application;
  }

  async quickApply(userId: string, dto: QuickApplyDto) {
    // Step 1: Validate candidate profile exists
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) {
      throw new ForbiddenException('Candidate profile required');
    }

    // Step 2: Get the default resume from resumes table
    const defaultResume = await this.db.query.resumes.findFirst({
      where: and(eq(resumes.profileId, profile.id), eq(resumes.isDefault, true)),
    });
    if (!defaultResume) {
      throw new BadRequestException(
        'Resume is required for Quick Apply. Please upload your resume first.',
      );
    }

    // Step 3: Verify job exists and is active
    const job = (await this.db.query.jobs.findFirst({
      where: and(eq(jobs.id, dto.jobId), eq(jobs.isActive, true)),
      with: { employer: true },
    })) as any;
    if (!job) {
      throw new NotFoundException('Job not found or not active');
    }

    // Step 4: Check for duplicate applications
    const existingApplication = await this.db.query.jobApplications.findFirst({
      where: and(eq(jobApplications.jobId, dto.jobId), eq(jobApplications.jobSeekerId, userId)),
    });
    if (existingApplication) {
      throw new ConflictException('Already applied to this job');
    }

    // Step 5: Create resume snapshot from profile data (using default resume URL)
    const resumeSnapshot = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phone: profile.phone,
      headline: profile.headline,
      professionalSummary: profile.professionalSummary,
      totalExperienceYears: profile.totalExperienceYears,
      city: profile.city,
      state: profile.state,
      country: profile.country,
      resumeUrl: defaultResume.filePath,
      snapshotAt: new Date().toISOString(),
    };

    // Step 6: Create application with initial status history
    const initialStatusHistory = [
      {
        status: 'applied',
        changedBy: 'candidate',
        timestamp: new Date().toISOString(),
      },
    ];

    const [application] = await this.db
      .insert(jobApplications)
      .values({
        jobId: dto.jobId,
        jobSeekerId: userId,
        resumeUrl: defaultResume.filePath,
        resumeSnapshot,
        coverLetter: dto.coverLetter,
        screeningAnswers: dto.screeningAnswers,
        status: 'applied',
        statusHistory: initialStatusHistory,
        source: 'quick_apply',
        companyId: job.companyId || null,
      })
      .returning();

    // Step 7: Increment job application count atomically
    await this.db
      .update(jobs)
      .set({ applicationCount: sql`${jobs.applicationCount} + 1` })
      .where(eq(jobs.id, dto.jobId));

    // Step 8: Send notification to employer (non-blocking)
    this.sqsService
      .sendNewApplicationNotification({
        employerId: job.employer?.userId,
        applicationId: application.id,
        jobTitle: job.title,
        candidateName: `${profile.firstName} ${profile.lastName}`,
      })
      .catch((err) =>
        this.logger.error(`Failed to send notification: ${err.message}`, 'ApplicationService'),
      );

    // Step 9: Send confirmation to candidate (non-blocking)
    this.getCompanyName(job.employer?.companyId).then((companyName) => {
      this.sqsService
        .sendApplicationReceivedCandidateNotification({
          userId,
          email: profile.email || '',
          candidateName: `${profile.firstName} ${profile.lastName}`,
          applicationId: application.id,
          jobTitle: job.title,
          companyName,
        })
        .catch((err) =>
          this.logger.error(`Failed to send notification: ${err.message}`, 'ApplicationService'),
        );
    });

    // Update isApplied flag in recommendation cache (non-blocking)
    this.updateRecommendationCache(userId, dto.jobId);

    return application;
  }

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

    const data = await this.db.query.jobApplications.findMany({
      where: conditions,
      with: {
        job: {
          with: {
            employer: true,
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
    });

    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(jobApplications)
      .where(conditions);

    // Batch lookup threadIds + compute reapplyDaysLeft for withdrawn applications
    const now = Date.now();
    const enrichedData = await Promise.all(
      data.map(async (app: any) => {
        const employerUserId = app.job?.employer?.userId;
        const threadId = employerUserId
          ? await this.getThreadId(userId, employerUserId, app.id)
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

    const applications = await this.db.query.jobApplications.findMany({
      where: eq(jobApplications.jobId, jobId),
      with: {
        jobSeeker: true,
        interviews: true,
      },
      orderBy: [desc(jobApplications.appliedAt)],
      limit,
      offset,
    });

    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(jobApplications)
      .where(eq(jobApplications.jobId, jobId));

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

  async getById(id: string, userId: string, userRole?: string) {
    const application = (await this.db.query.jobApplications.findFirst({
      where: eq(jobApplications.id, id),
      with: {
        job: { with: { employer: true } },
        jobSeeker: true,
        interviews: true,
        history: true,
        notes: true,
      },
    })) as any;

    if (!application) throw new NotFoundException('Application not found');

    // Verify access
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });

    let hasAccess =
      application.jobSeekerId === userId ||
      (employer && application.job?.employerId === employer.id);

    // Company-level fallback: employer from same company with company-applications:read permission
    if (!hasAccess && employer?.companyId && application.companyId === employer.companyId) {
      hasAccess = await hasCompanyPermission(
        this.db,
        employer.rbacRoleId,
        userRole || '',
        'company-applications:read',
      );
    }

    if (!hasAccess) throw new ForbiddenException('Access denied');

    return application;
  }

  async updateStatus(userId: string, applicationId: string, dto: UpdateApplicationStatusDto) {
    // Define allowed status transitions by role
    const ALLOWED_TRANSITIONS: Record<string, Record<string, string[]>> = {
      applied: {
        candidate: ['withdrawn'],
        employer: ['viewed', 'rejected'],
      },
      viewed: {
        employer: ['shortlisted', 'rejected'],
      },
      shortlisted: {
        employer: ['interview_scheduled', 'rejected'],
      },
      interview_scheduled: {
        employer: ['hired', 'rejected'],
      },
      hired: {
        candidate: ['offer_accepted', 'offer_rejected'],
      },
      withdrawn: {
        candidate: ['applied'],
      },
    };

    // Fetch application with job and employer/company details
    const application = (await this.db.query.jobApplications.findFirst({
      where: eq(jobApplications.id, applicationId),
      with: { job: { with: { employer: true } } },
    })) as any;

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Determine and validate role based on userId + application
    let userRole: string;
    if (application.jobSeekerId === userId) {
      userRole = 'candidate';
    } else {
      const employer = await this.db.query.employers.findFirst({
        where: eq(employers.userId, userId),
      });
      if (employer && application.job?.employerId === employer.id) {
        userRole = 'employer';
      } else if (employer?.companyId && application.companyId === employer.companyId) {
        // Company-level access fallback
        const hasPermission = await hasCompanyPermission(
          this.db,
          employer.rbacRoleId,
          'employer',
          'company-applications:read',
        );
        if (hasPermission) {
          userRole = 'employer';
        } else {
          throw new ForbiddenException('Access denied');
        }
      } else {
        throw new ForbiddenException('Access denied');
      }
    }

    const currentStatus = application.status;
    const newStatus = dto.status;

    // Validate status transition
    const allowedForCurrentStatus = ALLOWED_TRANSITIONS[currentStatus];
    if (!allowedForCurrentStatus) {
      throw new BadRequestException(`No transitions allowed from status '${currentStatus}'`);
    }

    const allowedForRole = allowedForCurrentStatus[userRole];
    if (!allowedForRole || !allowedForRole.includes(newStatus)) {
      const availableStatuses = allowedForRole?.join(', ') || 'none';
      throw new BadRequestException(
        `Invalid status transition. As ${userRole}, from '${currentStatus}' you can only change to: ${availableStatuses}`,
      );
    }

    // Update status
    await this.db
      .update(jobApplications)
      .set({ status: newStatus as any, updatedAt: new Date() })
      .where(eq(jobApplications.id, applicationId));

    // Record status change
    await this.db.insert(applicationHistory).values({
      applicationId,
      previousStatus: currentStatus as any,
      newStatus: newStatus as any,
      changedBy: userId,
      comment: dto.note,
    });

    // Send notification to the other party
    const notifyUserId =
      userRole === 'employer' ? application.jobSeekerId : application.job?.employer?.userId;

    if (notifyUserId) {
      // Fetch company name for the notification
      let companyName: string | undefined;
      if (application.job?.employer?.companyId) {
        const company = await this.db.query.companies.findFirst({
          where: eq(companies.id, application.job.employer.companyId),
        });
        companyName = company?.name;
      }

      await this.sqsService
        .sendApplicationNotification({
          userId: notifyUserId,
          applicationId,
          jobTitle: application.job?.title,
          jobId: application.jobId,
          companyName,
          status: newStatus,
        })
        .catch((err) =>
          this.logger.error(`Failed to send notification: ${err.message}`, 'ApplicationService'),
        );
    }

    return { message: 'Status updated', previousStatus: currentStatus, newStatus };
  }

  async withdraw(userId: string, applicationId: string) {
    const application = (await this.db.query.jobApplications.findFirst({
      where: and(eq(jobApplications.id, applicationId), eq(jobApplications.jobSeekerId, userId)),
      with: { job: { with: { employer: true } } },
    })) as any;

    if (!application) throw new NotFoundException('Application not found');

    await this.db
      .update(jobApplications)
      .set({ status: 'withdrawn' as any, updatedAt: new Date() })
      .where(eq(jobApplications.id, applicationId));

    // Notify employer about withdrawal (non-blocking)
    if (application.job?.employer?.userId) {
      const profile = await this.db.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
      });
      this.sqsService
        .sendApplicationWithdrawnNotification({
          employerId: application.job.employer.userId,
          applicationId,
          jobTitle: application.job?.title || '',
          candidateName: profile ? `${profile.firstName} ${profile.lastName}` : 'A candidate',
        })
        .catch((err) =>
          this.logger.error(`Failed to send notification: ${err.message}`, 'ApplicationService'),
        );
    }

    return { message: 'Application withdrawn' };
  }

  async addNote(userId: string, applicationId: string, content: string) {
    await this.db.insert(applicantNotes).values({
      applicationId,
      authorId: userId,
      note: content,
    });
    return { message: 'Note added' };
  }

  async getResumeDownloadUrl(
    userId: string,
    applicationId: string,
    userRole?: string,
  ): Promise<{ url: string }> {
    const application = (await this.db.query.jobApplications.findFirst({
      where: eq(jobApplications.id, applicationId),
      with: { job: true },
    })) as any;

    if (!application) throw new NotFoundException('Application not found');

    // Verify access: either the candidate or the employer who posted the job
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });

    let hasAccess =
      application.jobSeekerId === userId ||
      (employer && application.job?.employerId === employer.id);

    // Company-level fallback
    if (!hasAccess && employer?.companyId && application.companyId === employer.companyId) {
      hasAccess = await hasCompanyPermission(
        this.db,
        employer.rbacRoleId,
        userRole || '',
        'company-applications:read',
      );
    }

    if (!hasAccess) throw new ForbiddenException('Access denied');

    // Subscription enforcement for employer resume downloads
    if (employer && application.job?.employerId === employer.id) {
      const candidateProfile = await this.db.query.profiles.findFirst({
        where: eq(profiles.userId, application.jobSeekerId),
        columns: { id: true },
      });

      if (candidateProfile) {
        const alreadyViewed = await this.db.query.profileViews.findFirst({
          where: and(
            eq(profileViews.employerId, userId),
            eq(profileViews.profileId, candidateProfile.id),
          ),
        });

        if (!alreadyViewed) {
          // First access to this candidate — check and use resume credit
          const subscription = await this.subscriptionHelper.getActiveSubscription(employer.id);
          if (!subscription) {
            throw new ForbiddenException(
              'No active subscription found. Please subscribe to a plan to download resumes.',
            );
          }
          this.subscriptionHelper.checkLimit(subscription, 'resume_access');

          // Record the view and increment usage
          await this.db
            .insert(profileViews)
            .values({ profileId: candidateProfile.id, employerId: userId });
          await this.subscriptionHelper.incrementUsage(subscription.id, 'resume_access');
        }
      }
    }

    if (!application.resumeUrl) {
      throw new NotFoundException('No resume attached to this application');
    }

    // Return pre-signed download URL (valid for 1 hour)
    const signedUrl = await this.s3Service.getSignedDownloadUrlFromKeyOrUrl(application.resumeUrl);

    return { url: signedUrl! };
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

    // Fetch applications for these jobs
    const applications = await this.db.query.jobApplications.findMany({
      where: applicationConditions,
      orderBy: [desc(jobApplications.appliedAt)],
      limit,
      offset,
    });

    // Step 5: Get total count for pagination
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(jobApplications)
      .where(applicationConditions);

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

  async getApplicationHistory(userId: string, applicationId: string) {
    // Verify application belongs to this candidate
    const application = (await this.db.query.jobApplications.findFirst({
      where: and(eq(jobApplications.id, applicationId), eq(jobApplications.jobSeekerId, userId)),
      with: {
        job: true,
        interviews: {
          orderBy: (i, { asc }) => [asc(i.scheduledAt)],
        },
      },
    })) as any;

    if (!application) throw new NotFoundException('Application not found');

    // Fetch status change history
    const history = await this.db.query.applicationHistory.findMany({
      where: eq(applicationHistory.applicationId, applicationId),
      orderBy: (h, { asc }) => [asc(h.createdAt)],
    });

    // Build timeline: start with "applied" entry, then add status changes and interviews
    const timeline: {
      event: string;
      status?: string;
      description?: string;
      interviewType?: string;
      interviewMode?: string;
      scheduledAt?: Date | null;
      meetingLink?: string | null;
      duration?: number | null;
      location?: string | null;
      interviewStatus?: string;
      timestamp: Date;
    }[] = [];

    // Status description mapping
    const statusDescriptions: Record<string, string> = {
      applied: 'Your application has been submitted successfully',
      viewed: 'Your application has been viewed by the employer',
      shortlisted: 'You have been shortlisted for this position',
      interview_scheduled: 'An interview has been scheduled for this position',
      rejected: 'Your application was not selected for this position',
      hired: 'Congratulations! You have been hired for this position',
      offer_accepted: 'You have accepted the job offer',
      offer_rejected: 'The job offer has been declined',
      withdrawn: 'You have withdrawn your application',
    };

    // Add initial application event
    timeline.push({
      event: 'application_submitted',
      status: 'applied',
      description: statusDescriptions['applied'],
      timestamp: application.appliedAt,
    });

    // Add status change events
    for (const h of history) {
      timeline.push({
        event: 'status_changed',
        status: h.newStatus,
        description: h.comment ?? statusDescriptions[h.newStatus] ?? 'Application status updated',
        timestamp: h.createdAt,
      });
    }

    // Interview status description mapping
    const interviewStatusDescriptions: Record<string, string> = {
      scheduled: 'Interview has been scheduled',
      confirmed: 'Interview has been confirmed by both side',
      completed: 'Interview has been completed',
      rescheduled: 'Interview has been rescheduled',
      canceled: 'Interview has been canceled',
      no_show: 'Candidate did not attend the interview',
    };

    // Add interview events
    for (const interview of application.interviews || []) {
      const typeLabel = interview.interviewType?.replace(/_/g, ' ') ?? 'interview';
      const modeLabel = interview.interviewMode === 'online' ? 'Online' : 'In-person';
      const dateStr = interview.scheduledAt
        ? new Date(interview.scheduledAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : '';

      timeline.push({
        event: 'interview',
        description: `${modeLabel} ${typeLabel} round${dateStr ? ` scheduled for ${dateStr}` : ''} — ${interviewStatusDescriptions[interview.status] ?? interview.status}`,
        interviewType: interview.interviewType,
        interviewMode: interview.interviewMode,
        scheduledAt: interview.scheduledAt,
        meetingLink: interview.meetingLink,
        duration: interview.duration,
        location: interview.location,
        interviewStatus: interview.status,
        timestamp: interview.createdAt,
      });
    }

    // Sort timeline by timestamp descending (most recent first)
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      message: 'Application history fetched successfully',
      data: {
        applicationId: application.id,
        jobId: application.jobId,
        jobTitle: application.job?.title || null,
        currentStatus: application.status,
        appliedAt: application.appliedAt,
        timeline,
      },
    };
  }

  /**
   * Get candidate profile for a specific application
   * Only accessible by employer who owns the job linked to the application
   */
  async getCandidateProfileForApplication(
    userId: string,
    applicationId: string,
    userRole?: string,
  ) {
    // Step 1: Find employer record for this user
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    // Step 2: Validate application exists and employer owns the job
    const application = (await this.db.query.jobApplications.findFirst({
      where: eq(jobApplications.id, applicationId),
      with: { job: true },
    })) as any;

    if (!application) throw new NotFoundException('Application not found');

    // Verify employer owns this job or has company-level access
    if (application.job?.employerId !== employer.id) {
      let hasCompanyAccess = false;
      if (employer.companyId && application.companyId === employer.companyId) {
        hasCompanyAccess = await hasCompanyPermission(
          this.db,
          employer.rbacRoleId,
          userRole || '',
          'company-applications:read',
        );
      }
      if (!hasCompanyAccess) {
        throw new ForbiddenException('Access denied');
      }
    }

    // Step 3: Check if employer already viewed this candidate (avoid double-counting)
    const candidateProfileBasic = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, application.jobSeekerId),
      columns: { id: true },
    });

    let isFirstView = true;
    if (candidateProfileBasic) {
      const existingView = await this.db.query.profileViews.findFirst({
        where: and(
          eq(profileViews.employerId, userId),
          eq(profileViews.profileId, candidateProfileBasic.id),
        ),
      });
      isFirstView = !existingView;
    }

    // Step 4: If first view, enforce subscription resume access limit
    if (isFirstView) {
      const subscription = await this.subscriptionHelper.getActiveSubscription(employer.id);
      if (!subscription) {
        throw new ForbiddenException(
          'No active subscription found. Please subscribe to a plan to access candidate profiles.',
        );
      }
      this.subscriptionHelper.checkLimit(subscription, 'resume_access');
    }

    // Step 5: Fetch full candidate profile with related data
    const candidateProfile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, application.jobSeekerId),
      with: {
        workExperiences: true,
        educationRecords: true,
        certifications: true,
        profileSkills: {
          with: {
            skill: true,
          },
        },
        jobPreferences: true,
      },
    });

    if (!candidateProfile) {
      throw new NotFoundException('Candidate profile not found');
    }

    // Step 6: Get public URL for profile photo if exists
    const profilePhotoUrl = this.s3Service.getPublicUrlFromKeyOrUrl(
      candidateProfile.profilePhoto || null,
    );

    // Step 7: Record profile view and increment subscription usage (first view only)
    if (isFirstView) {
      this.db
        .insert(profileViews)
        .values({ profileId: candidateProfile.id, employerId: userId })
        .then(async () => {
          const subscription = await this.subscriptionHelper.getActiveSubscription(employer.id);
          if (subscription) {
            await this.subscriptionHelper.incrementUsage(subscription.id, 'resume_access');
          }
        })
        .catch((err) =>
          this.logger.error(`Failed to record profile view: ${err.message}`, 'ApplicationService'),
        );
    }

    // Step 8: Build response - similar structure to GET /candidates/profile
    // but with resumeUrl from job_applications
    return {
      profile: {
        firstName: candidateProfile.firstName,
        lastName: candidateProfile.lastName,
        email: candidateProfile.email,
        phone: candidateProfile.phone,
        headline: candidateProfile.headline,
        professionalSummary: candidateProfile.professionalSummary,
        totalExperienceYears: candidateProfile.totalExperienceYears,
        city: candidateProfile.city,
        state: candidateProfile.state,
        country: candidateProfile.country,
        profilePhoto: profilePhotoUrl,
      },
      workExperiences: candidateProfile.workExperiences || [],
      educationRecords: candidateProfile.educationRecords || [],
      certifications: candidateProfile.certifications || [],
      skills: (candidateProfile.profileSkills || []).map((ps: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { skill, ...rest } = ps;
        return {
          ...rest,
          skillName: skill?.name,
          category: skill?.category,
        };
      }),
      jobPreferences: candidateProfile.jobPreferences || null,
      application: {
        applicationId: application.id,
        jobId: application.jobId,
        jobTitle: application.job?.title || null,
        status: application.status,
        appliedAt: application.appliedAt,
        resumeUrl: application.resumeUrl,
        resumeId: application.resumeUrl
          ? (
              await this.db.query.resumes.findFirst({
                where: eq(resumes.filePath, application.resumeUrl),
                columns: { id: true },
              })
            )?.id || null
          : null,
        coverLetter: application.coverLetter,
        threadId: await this.getThreadId(userId, application.jobSeekerId, application.id),
      },
    };
  }

  /**
   * Looks up an existing message thread between two users for a specific application.
   */
  private async getThreadId(
    userIdA: string,
    userIdB: string,
    applicationId: string,
  ): Promise<string | null> {
    const participants = [userIdA, userIdB].sort().join(',');
    const thread = await this.db.query.messageThreads.findFirst({
      where: and(
        eq(messageThreads.participants, participants),
        eq(messageThreads.applicationId, applicationId),
      ),
      columns: { id: true },
    });
    return thread?.id || null;
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

    // Step 4: Fetch applications for this job
    const applications = await this.db.query.jobApplications.findMany({
      where: eq(jobApplications.jobId, query.jobId),
      orderBy: [desc(jobApplications.appliedAt)],
      limit,
      offset,
    });

    // Step 5: Get total count for pagination
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(jobApplications)
      .where(eq(jobApplications.jobId, query.jobId));

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

  async getCandidateAnalytics(userId: string) {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
      columns: { id: true },
    });
    if (!profile) throw new ForbiddenException('Candidate profile required');

    const [
      appliedResult,
      underReviewResult,
      shortlistedResult,
      interviewsResult,
      rejectedResult,
      hiredResult,
      profileViewsResult,
    ] = await Promise.all([
      // Jobs applied (excluding withdrawn)
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(jobApplications)
        .where(
          and(
            eq(jobApplications.jobSeekerId, userId),
            sql`${jobApplications.status} != 'withdrawn'`,
          ),
        ),
      // Under review (employer viewed but not yet shortlisted)
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(jobApplications)
        .where(and(eq(jobApplications.jobSeekerId, userId), eq(jobApplications.status, 'viewed'))),
      // Shortlisted
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(jobApplications)
        .where(
          and(eq(jobApplications.jobSeekerId, userId), eq(jobApplications.status, 'shortlisted')),
        ),
      // Interview scheduled
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(jobApplications)
        .where(
          and(
            eq(jobApplications.jobSeekerId, userId),
            eq(jobApplications.status, 'interview_scheduled'),
          ),
        ),
      // Rejected
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(jobApplications)
        .where(
          and(eq(jobApplications.jobSeekerId, userId), eq(jobApplications.status, 'rejected')),
        ),
      // Hired (hired or offer_accepted)
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(jobApplications)
        .where(
          and(
            eq(jobApplications.jobSeekerId, userId),
            sql`${jobApplications.status} IN ('hired', 'offer_accepted')`,
          ),
        ),
      // Profile views
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(profileViews)
        .where(eq(profileViews.profileId, profile.id)),
    ]);

    return {
      message: 'Candidate analytics fetched successfully',
      data: {
        jobsApplied: Number(appliedResult[0]?.count || 0),
        underReview: Number(underReviewResult[0]?.count || 0),
        shortlisted: Number(shortlistedResult[0]?.count || 0),
        interviews: Number(interviewsResult[0]?.count || 0),
        rejected: Number(rejectedResult[0]?.count || 0),
        hired: Number(hiredResult[0]?.count || 0),
        profileViews: Number(profileViewsResult[0]?.count || 0),
      },
    };
  }

  async getEmployerAnalytics(userId: string) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    const employerJobs = await this.db.query.jobs.findMany({
      where: eq(jobs.employerId, employer.id),
      columns: { id: true },
    });
    const jobIds = employerJobs.map((j) => j.id);

    if (jobIds.length === 0) {
      return {
        message: 'Employer analytics fetched successfully',
        data: {
          jobsCreated: 0,
          totalApplications: 0,
          shortlisted: 0,
          upcomingInterviews: 0,
          rejected: 0,
          hired: 0,
        },
      };
    }

    const [
      totalApplicationsResult,
      shortlistedResult,
      rejectedResult,
      hiredResult,
      upcomingInterviewsResult,
    ] = await Promise.all([
      // Total applications
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(jobApplications)
        .where(inArray(jobApplications.jobId, jobIds)),
      // Shortlisted
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(jobApplications)
        .where(
          and(inArray(jobApplications.jobId, jobIds), eq(jobApplications.status, 'shortlisted')),
        ),
      // Rejected
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(jobApplications)
        .where(and(inArray(jobApplications.jobId, jobIds), eq(jobApplications.status, 'rejected'))),
      // Hired (hired or offer_accepted)
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(jobApplications)
        .where(
          and(
            inArray(jobApplications.jobId, jobIds),
            sql`${jobApplications.status} IN ('hired', 'offer_accepted')`,
          ),
        ),
      // Upcoming interviews (status = scheduled AND scheduledAt > now)
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(interviews)
        .innerJoin(jobApplications, eq(interviews.applicationId, jobApplications.id))
        .where(
          and(
            inArray(jobApplications.jobId, jobIds),
            eq(interviews.status, 'scheduled'),
            gt(interviews.scheduledAt, new Date()),
          ),
        ),
    ]);

    return {
      message: 'Employer analytics fetched successfully',
      data: {
        jobsCreated: jobIds.length,
        totalApplications: Number(totalApplicationsResult[0]?.count || 0),
        shortlisted: Number(shortlistedResult[0]?.count || 0),
        upcomingInterviews: Number(upcomingInterviewsResult[0]?.count || 0),
        rejected: Number(rejectedResult[0]?.count || 0),
        hired: Number(hiredResult[0]?.count || 0),
      },
    };
  }

  private async getCompanyName(companyId?: string | null): Promise<string> {
    if (!companyId) return 'the company';
    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });
    return company?.name || 'the company';
  }
}
