import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CustomLogger } from '@ai-job-portal/logger';
import { eq, and, or, sql, inArray } from 'drizzle-orm';
import {
  Database,
  jobApplications,
  applicationHistory,
  applicantNotes,
  jobs,
  profiles,
  employers,
  resumes,
  interviews,
} from '@ai-job-portal/database';
import { SqsService, S3Service } from '@ai-job-portal/aws';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { DATABASE_CLIENT } from '../database/database.module';
import { REDIS_CLIENT } from '../redis/redis.module';
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
import { eventTypeFromStatus } from './application-history.constants';
import { employerPublicColumns, jobSeekerPublicColumns } from './application-columns.const';
import { ApplicationEnrichmentHelper } from './application-enrichment.helper';
import { ApplicationQueryService } from './application-query.service';
import { ApplicationHistoryService } from './application-history.service';
import { ApplicationAnalyticsService } from './application-analytics.service';

@Injectable()
export class ApplicationService {
  private readonly logger = new CustomLogger();

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly sqsService: SqsService,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
    private readonly enrichmentHelper: ApplicationEnrichmentHelper,
    private readonly queryService: ApplicationQueryService,
    private readonly historyService: ApplicationHistoryService,
    private readonly analyticsService: ApplicationAnalyticsService,
  ) {}

  async apply(userId: string, dto: ApplyJobDto) {
    // Get candidate profile for name display
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new ForbiddenException('Candidate profile required');

    // Check job exists and is active
    const job = (await this.db.query.jobs.findFirst({
      where: eq(jobs.id, dto.jobId),
      with: { employer: true },
    })) as any;
    if (!job) throw new NotFoundException('Job not found');
    if (job.status === 'hold') {
      throw new ForbiddenException('This job is on hold and not accepting applications');
    }
    if (!job.isActive) throw new NotFoundException('Job not found or not active');

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
    this.enrichmentHelper.getCompanyName(job.employer?.companyId).then((companyName) => {
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
      throw new BadRequestException('Resume is required for Quick Apply.');
    }

    // Step 3: Verify job exists and is active
    const job = (await this.db.query.jobs.findFirst({
      where: eq(jobs.id, dto.jobId),
      with: { employer: true },
    })) as any;
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    if (job.status === 'hold') {
      throw new ForbiddenException('This job is on hold and not accepting applications');
    }
    if (!job.isActive) {
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
    this.enrichmentHelper.getCompanyName(job.employer?.companyId).then((companyName) => {
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

    return application;
  }

  async getCandidateApplications(userId: string, query: CandidateApplicationsQueryDto) {
    return this.queryService.getCandidateApplications(userId, query);
  }

  async getJobApplications(userId: string, jobId: string, query: PaginationDto, userRole?: string) {
    return this.queryService.getJobApplications(userId, jobId, query, userRole);
  }

  async getById(id: string, userId: string, userRole?: string) {
    const application = (await this.db.query.jobApplications.findFirst({
      where: eq(jobApplications.id, id),
      with: {
        job: { with: { employer: { columns: employerPublicColumns } } },
        jobSeeker: { columns: jobSeekerPublicColumns },
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

  async updateStatus(
    userId: string,
    applicationId: string,
    dto: UpdateApplicationStatusDto,
    userRole?: string,
  ) {
    // Define allowed status transitions by role
    const ALLOWED_TRANSITIONS: Record<string, Record<string, string[]>> = {
      applied: {
        candidate: ['withdrawn'],
        employer: ['viewed', 'shortlisted', 'rejected'],
      },
      viewed: {
        employer: ['shortlisted', 'rejected'],
      },
      shortlisted: {
        employer: ['interview_scheduled', 'rejected'],
      },
      interview_scheduled: {
        employer: ['interview_in_progress', 'interview_completed', 'hired', 'rejected'],
      },
      interview_rescheduled: {
        employer: ['interview_in_progress', 'interview_completed', 'hired', 'rejected'],
      },
      interview_in_progress: {
        employer: ['interview_scheduled', 'interview_completed', 'hired', 'rejected'],
      },
      interview_cancelled: {
        employer: ['interview_scheduled', 'hired', 'rejected'],
      },
      interview_completed: {
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
    let effectiveRole: string;
    if (application.jobSeekerId === userId) {
      effectiveRole = 'candidate';
    } else {
      const employer = await this.db.query.employers.findFirst({
        where: eq(employers.userId, userId),
      });
      if (employer && application.job?.employerId === employer.id) {
        effectiveRole = 'employer';
      } else if (employer?.companyId && application.companyId === employer.companyId) {
        // Company-level access fallback
        const hasPermission = await hasCompanyPermission(
          this.db,
          employer.rbacRoleId,
          userRole || 'employer',
          'company-applications:read',
        );
        if (hasPermission) {
          effectiveRole = 'employer';
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

    const allowedForRole = allowedForCurrentStatus[effectiveRole];
    if (!allowedForRole || !allowedForRole.includes(newStatus)) {
      const availableStatuses = allowedForRole?.join(', ') || 'none';
      throw new BadRequestException(
        `Invalid status transition. As ${effectiveRole}, from '${currentStatus}' you can only change to: ${availableStatuses}`,
      );
    }

    // When hiring, block if any interview is still active (scheduled or confirmed)
    if (newStatus === 'hired') {
      const activeInterview = await this.db.query.interviews.findFirst({
        where: and(
          eq(interviews.applicationId, applicationId),
          or(
            eq(interviews.status, 'scheduled' as any),
            eq(interviews.status, 'confirmed' as any),
            eq(interviews.status, 'rescheduled' as any),
          ),
        ),
      });

      if (activeInterview) {
        throw new BadRequestException(
          'Candidate cannot be hired until the interview is completed or canceled.',
        );
      }
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
      eventType: eventTypeFromStatus(newStatus),
      metadata: dto.note ? { notes: dto.note } : null,
      comment: dto.note,
    });

    // Send notification to the other party
    const notifyUserId =
      effectiveRole === 'employer' ? application.jobSeekerId : application.job?.employer?.userId;

    if (notifyUserId) {
      // Fetch company name for the notification
      let companyName: string | undefined;
      if (application.job?.employer?.companyId) {
        companyName = await this.enrichmentHelper.getCompanyName(
          application.job.employer.companyId,
        );
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

    // Statuses that cannot be withdrawn
    const NON_WITHDRAWABLE = ['hired', 'rejected', 'withdrawn', 'offer_accepted'];
    if (NON_WITHDRAWABLE.includes(application.status)) {
      throw new BadRequestException(
        `Cannot withdraw an application with status '${application.status}'`,
      );
    }

    // If interview is scheduled/rescheduled, block withdrawal within 2 hours of the interview
    if (['interview_scheduled', 'interview_rescheduled'].includes(application.status)) {
      const upcomingInterview = await this.db.query.interviews.findFirst({
        where: and(
          eq(interviews.applicationId, applicationId),
          inArray(interviews.status, ['scheduled', 'confirmed', 'rescheduled'] as any),
        ),
      });

      if (upcomingInterview?.scheduledAt) {
        const hoursUntilInterview =
          (new Date(upcomingInterview.scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60);

        if (hoursUntilInterview <= 2) {
          throw new BadRequestException('Cannot withdraw within 2 hours of a scheduled interview');
        }
      }
    }

    const previousStatus = application.status;

    await this.db
      .update(jobApplications)
      .set({ status: 'withdrawn' as any, updatedAt: new Date() })
      .where(eq(jobApplications.id, applicationId));

    // Record withdrawal in history
    await this.db.insert(applicationHistory).values({
      applicationId,
      previousStatus: previousStatus as any,
      newStatus: 'withdrawn' as any,
      changedBy: userId,
      eventType: eventTypeFromStatus('withdrawn'),
      comment: 'You have withdrawn your application.',
    });

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

    // The candidate applied to this job, so downloading their application resume is
    // always free — no profile_access credit and no subscription required. Paid resume
    // access only applies to the candidate-search flow (user-service).

    if (!application.resumeUrl) {
      throw new NotFoundException('No resume attached to this application');
    }

    // Return pre-signed download URL (valid for 1 hour)
    const signedUrl = await this.s3Service.getSignedDownloadUrlFromKeyOrUrl(application.resumeUrl);

    return { url: signedUrl! };
  }

  async getAllEmployerApplications(
    userId: string,
    query: EmployerApplicationsQueryDto,
    userRole?: string,
    scope?: string,
  ) {
    return this.queryService.getAllEmployerApplications(userId, query, userRole, scope);
  }

  async getApplicationHistory(userId: string, applicationId: string) {
    return this.historyService.getApplicationHistory(userId, applicationId);
  }

  async getEmployerApplicationHistory(userId: string, applicationId: string, userRole?: string) {
    return this.historyService.getEmployerApplicationHistory(userId, applicationId, userRole);
  }

  async getCandidateProfileForApplication(
    userId: string,
    applicationId: string,
    userRole?: string,
  ) {
    return this.enrichmentHelper.getCandidateProfileForApplication(userId, applicationId, userRole);
  }

  async getEmployerJobApplicants(
    userId: string,
    query: EmployerJobApplicantsQueryDto,
    userRole?: string,
  ) {
    return this.queryService.getEmployerJobApplicants(userId, query, userRole);
  }

  async getEmployerApplicationsSummary(
    userId: string,
    query: EmployerJobsSummaryQueryDto,
    userRole?: string,
    scope?: string,
  ) {
    return this.queryService.getEmployerApplicationsSummary(userId, query, userRole, scope);
  }

  async getCandidateAnalytics(userId: string) {
    return this.analyticsService.getCandidateAnalytics(userId);
  }

  async getEmployerAnalytics(userId: string) {
    return this.analyticsService.getEmployerAnalytics(userId);
  }
}
