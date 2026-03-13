import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CustomLogger } from '@ai-job-portal/logger';
import { eq, and, desc, sql, inArray, ilike } from 'drizzle-orm';
import {
  Database,
  jobApplications,
  applicationHistory,
  applicantNotes,
  jobs,
  profiles,
  employers,
  companies,
  resumes,
} from '@ai-job-portal/database';
import { SqsService, S3Service } from '@ai-job-portal/aws';
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
import { PaginationDto } from '@ai-job-portal/common';

@Injectable()
export class ApplicationService {
  private readonly logger = new CustomLogger();

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly sqsService: SqsService,
    private readonly s3Service: S3Service,
  ) {}

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

    return application;
  }

  async getCandidateApplications(userId: string, query: CandidateApplicationsQueryDto) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const offset = (page - 1) * limit;

    // Build where conditions
    let conditions: any = eq(jobApplications.jobSeekerId, userId);
    if (query.status) {
      conditions = and(conditions, eq(jobApplications.status, query.status as any));
    }

    const data = await this.db.query.jobApplications.findMany({
      where: conditions,
      with: {
        job: { with: { employer: true } },
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

    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);

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

  async getJobApplications(userId: string, jobId: string, query: PaginationDto) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    const job = await this.db.query.jobs.findFirst({
      where: and(eq(jobs.id, jobId), eq(jobs.employerId, employer.id)),
    });
    if (!job) throw new NotFoundException('Job not found');

    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const offset = (page - 1) * limit;

    const data = await this.db.query.jobApplications.findMany({
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

  async getById(id: string, userId: string) {
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

    const hasAccess =
      application.jobSeekerId === userId ||
      (employer && application.job?.employerId === employer.id);

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

  async getResumeDownloadUrl(userId: string, applicationId: string): Promise<{ url: string }> {
    const application = (await this.db.query.jobApplications.findFirst({
      where: eq(jobApplications.id, applicationId),
      with: { job: true },
    })) as any;

    if (!application) throw new NotFoundException('Application not found');

    // Verify access: either the candidate or the employer who posted the job
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });

    const hasAccess =
      application.jobSeekerId === userId ||
      (employer && application.job?.employerId === employer.id);

    if (!hasAccess) throw new ForbiddenException('Access denied');

    if (!application.resumeUrl) {
      throw new NotFoundException('No resume attached to this application');
    }

    // Return permanent public URL for the resume
    const publicUrl = this.s3Service.getPublicUrlFromKeyOrUrl(application.resumeUrl);

    return { url: publicUrl! };
  }

  /**
   * Get all applications for all jobs owned by the employer
   * Supports optional filtering by job name (case-insensitive, partial match)
   */
  async getAllEmployerApplications(userId: string, query: EmployerApplicationsQueryDto) {
    // Step 1: Find employer record for this user
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    // Step 2: Get all jobs owned by this employer
    let jobConditions = eq(jobs.employerId, employer.id);

    // Apply job name filter if provided (case-insensitive, partial match)
    if (query.jobName) {
      jobConditions = and(jobConditions, ilike(jobs.title, `%${query.jobName}%`)) as any;
    }

    const employerJobs = await this.db.query.jobs.findMany({
      where: jobConditions,
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

        // Get public URL for profile photo if exists
        const profilePhotoUrl = this.s3Service.getPublicUrlFromKeyOrUrl(
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
   * Get candidate profile for a specific application
   * Only accessible by employer who owns the job linked to the application
   */
  async getCandidateProfileForApplication(userId: string, applicationId: string) {
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

    // Verify employer owns this job
    if (application.job?.employerId !== employer.id) {
      throw new ForbiddenException('Access denied');
    }

    // Step 3: Fetch full candidate profile with related data
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

    // Step 4: Get public URL for profile photo if exists
    const profilePhotoUrl = this.s3Service.getPublicUrlFromKeyOrUrl(
      candidateProfile.profilePhoto || null,
    );

    // Step 5: Build response - similar structure to GET /candidates/profile
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
        coverLetter: application.coverLetter,
      },
    };
  }

  /**
   * Get applicants for a specific employer job
   * Lightweight list for applicants view (not full profile)
   */
  async getEmployerJobApplicants(userId: string, query: EmployerJobApplicantsQueryDto) {
    // Step 1: Find employer record for this user
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    // Step 2: Verify job exists and belongs to this employer
    const job = await this.db.query.jobs.findFirst({
      where: and(eq(jobs.id, query.jobId), eq(jobs.employerId, employer.id)),
    });
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
    const data = filteredApplications.map((app) => {
      const candidateProfile = profileMap.get(app.jobSeekerId);

      // Get public URL for profile photo if exists
      const profilePhotoUrl = this.s3Service.getPublicUrlFromKeyOrUrl(
        candidateProfile?.profilePhoto || null,
      );

      return {
        applicationId: app.id,
        candidateId: app.jobSeekerId,
        candidateName: candidateProfile
          ? `${candidateProfile.firstName || ''} ${candidateProfile.lastName || ''}`.trim() || null
          : null,
        candidateProfilePhoto: profilePhotoUrl,
        appliedAt: app.appliedAt,
        jobId: app.jobId,
      };
    });

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
  async getEmployerApplicationsSummary(userId: string, query: EmployerJobsSummaryQueryDto) {
    // Step 1: Find employer record with company info
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
      with: { company: true },
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    // Step 2: Build job filter conditions
    let jobConditions = eq(jobs.employerId, employer.id);

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

  private async getCompanyName(companyId?: string | null): Promise<string> {
    if (!companyId) return 'the company';
    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });
    return company?.name || 'the company';
  }
}
