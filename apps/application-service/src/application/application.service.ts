import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  Database,
  jobApplications,
  applicationHistory,
  applicantNotes,
  jobs,
  profiles,
  employers,
  resumes,
} from '@ai-job-portal/database';
import { SqsService } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import { ApplyJobDto, UpdateApplicationStatusDto, QuickApplyDto } from './dto';
import { PaginationDto } from '@ai-job-portal/common';

@Injectable()
export class ApplicationService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly sqsService: SqsService,
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

    // Create application
    const [application] = await this.db
      .insert(jobApplications)
      .values({
        jobId: dto.jobId,
        jobSeekerId: userId,
        resumeUrl: dto.resumeUrl,
        coverLetter: dto.coverLetter,
        screeningAnswers: dto.answers,
        status: 'applied',
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
      .catch(() => {
        // Notification failure should not fail the application
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
      .catch(() => {
        // Notification failure should not fail the application
      });

    return application;
  }

  async getCandidateApplications(userId: string, query: PaginationDto) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const offset = (page - 1) * limit;

    const data = await this.db.query.jobApplications.findMany({
      where: eq(jobApplications.jobSeekerId, userId),
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
      .where(eq(jobApplications.jobSeekerId, userId));

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
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    const application = (await this.db.query.jobApplications.findFirst({
      where: eq(jobApplications.id, applicationId),
      with: { job: true },
    })) as any;

    if (!application || application.job?.employerId !== employer.id) {
      throw new NotFoundException('Application not found');
    }

    const previousStatus = application.status;

    // Update status
    await this.db
      .update(jobApplications)
      .set({ status: dto.status as any, updatedAt: new Date() })
      .where(eq(jobApplications.id, applicationId));

    // Record status change
    await this.db.insert(applicationHistory).values({
      applicationId,
      previousStatus: previousStatus as any,
      newStatus: dto.status as any,
      changedBy: userId,
      comment: dto.note,
    });

    // Send notification
    await this.sqsService.sendApplicationNotification({
      userId: application.jobSeekerId,
      applicationId,
      jobTitle: application.job?.title,
      status: dto.status,
    });

    return { message: 'Status updated' };
  }

  async withdraw(userId: string, applicationId: string) {
    const application = await this.db.query.jobApplications.findFirst({
      where: and(eq(jobApplications.id, applicationId), eq(jobApplications.jobSeekerId, userId)),
    });

    if (!application) throw new NotFoundException('Application not found');

    await this.db
      .update(jobApplications)
      .set({ status: 'withdrawn' as any, updatedAt: new Date() })
      .where(eq(jobApplications.id, applicationId));

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
}
