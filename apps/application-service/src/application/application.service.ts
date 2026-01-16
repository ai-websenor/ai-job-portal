import { Injectable, Inject, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  Database,
  applications,
  applicationStatusHistory,
  applicationNotes,
  jobs,
  candidateProfiles,
  employerProfiles,
} from '@ai-job-portal/database';
import { SqsService } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import { ApplyJobDto, UpdateApplicationStatusDto } from './dto';

@Injectable()
export class ApplicationService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly sqsService: SqsService,
  ) {}

  async apply(userId: string, dto: ApplyJobDto) {
    // Get candidate profile
    const candidate = await this.db.query.candidateProfiles.findFirst({
      where: eq(candidateProfiles.userId, userId),
    });
    if (!candidate) throw new ForbiddenException('Candidate profile required');

    // Check job exists and is active
    const job = await (this.db.query as any).jobs.findFirst({
      where: and(eq(jobs.id, dto.jobId), eq(jobs.status, 'active')),
      with: { employerProfile: true },
    });
    if (!job) throw new NotFoundException('Job not found or not active');

    // Check not already applied
    const existing = await (this.db.query as any).applications.findFirst({
      where: and(
        eq(applications.jobId, dto.jobId),
        eq(applications.candidateProfileId, candidate.id),
      ),
    });
    if (existing) throw new ConflictException('Already applied to this job');

    // Create application
    const [application] = await this.db.insert(applications).values({
      jobId: dto.jobId,
      candidateProfileId: candidate.id,
      resumeId: dto.resumeId,
      coverLetter: dto.coverLetter,
      answers: dto.answers ? JSON.stringify(dto.answers) : null,
      status: 'pending',
    } as any).returning();

    // Update job application count
    await this.db.update(jobs)
      .set({ applicationCount: sql`${jobs.applicationCount} + 1` } as any)
      .where(eq(jobs.id, dto.jobId));

    // Send notification to employer
    await this.sqsService.sendNewApplicationNotification({
      employerId: job.employerProfile?.userId,
      applicationId: application.id,
      jobTitle: job.title,
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
    });

    return application;
  }

  async getCandidateApplications(userId: string) {
    const candidate = await this.db.query.candidateProfiles.findFirst({
      where: eq(candidateProfiles.userId, userId),
    });
    if (!candidate) throw new ForbiddenException('Candidate profile required');

    return this.db.query.applications.findMany({
      where: eq(applications.candidateProfileId, candidate.id),
      with: {
        job: { with: { employerProfile: true } },
        interviews: true,
      },
      orderBy: [desc(applications.appliedAt)],
    });
  }

  async getJobApplications(userId: string, jobId: string) {
    const employer = await this.db.query.employerProfiles.findFirst({
      where: eq(employerProfiles.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    const job = await this.db.query.jobs.findFirst({
      where: and(eq(jobs.id, jobId), eq(jobs.employerProfileId, employer.id)),
    });
    if (!job) throw new NotFoundException('Job not found');

    return this.db.query.applications.findMany({
      where: eq(applications.jobId, jobId),
      with: {
        candidateProfile: { with: { resumes: true, skills: true } },
        interviews: true,
      },
      orderBy: [desc(applications.appliedAt)],
    });
  }

  async getById(id: string, userId: string) {
    const application = await (this.db.query as any).applications.findFirst({
      where: eq(applications.id, id),
      with: {
        job: { with: { employerProfile: true } },
        candidateProfile: { with: { resumes: true, experiences: true, education: true } },
        interviews: true,
        statusHistory: true,
        notes: true,
      },
    });

    if (!application) throw new NotFoundException('Application not found');

    // Verify access
    const candidate = await this.db.query.candidateProfiles.findFirst({
      where: eq(candidateProfiles.userId, userId),
    });
    const employer = await this.db.query.employerProfiles.findFirst({
      where: eq(employerProfiles.userId, userId),
    });

    const hasAccess =
      (candidate && application.candidateProfileId === candidate.id) ||
      (employer && application.job?.employerProfileId === employer.id);

    if (!hasAccess) throw new ForbiddenException('Access denied');

    return application;
  }

  async updateStatus(userId: string, applicationId: string, dto: UpdateApplicationStatusDto) {
    const employer = await this.db.query.employerProfiles.findFirst({
      where: eq(employerProfiles.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    const application = await (this.db.query as any).applications.findFirst({
      where: eq(applications.id, applicationId),
      with: { job: true, candidateProfile: true },
    });

    if (!application || application.job?.employerProfileId !== employer.id) {
      throw new NotFoundException('Application not found');
    }

    const previousStatus = application.status;

    // Update status
    await this.db.update(applications)
      .set({ status: dto.status, updatedAt: new Date() } as any)
      .where(eq(applications.id, applicationId));

    // Record status change
    await this.db.insert(applicationStatusHistory).values({
      applicationId,
      fromStatus: previousStatus,
      toStatus: dto.status,
      changedBy: userId,
      note: dto.note,
    } as any);

    // Send notification
    await this.sqsService.sendApplicationNotification({
      userId: application.candidateProfile?.userId,
      applicationId,
      jobTitle: application.job?.title,
      status: dto.status,
    });

    return { message: 'Status updated' };
  }

  async withdraw(userId: string, applicationId: string) {
    const candidate = await this.db.query.candidateProfiles.findFirst({
      where: eq(candidateProfiles.userId, userId),
    });
    if (!candidate) throw new ForbiddenException('Candidate profile required');

    const application = await this.db.query.applications.findFirst({
      where: and(
        eq(applications.id, applicationId),
        eq(applications.candidateProfileId, candidate.id),
      ),
    });

    if (!application) throw new NotFoundException('Application not found');

    await this.db.update(applications)
      .set({ status: 'withdrawn', updatedAt: new Date() } as any)
      .where(eq(applications.id, applicationId));

    return { message: 'Application withdrawn' };
  }

  async addNote(userId: string, applicationId: string, content: string, isPrivate: boolean = true) {
    await this.db.insert(applicationNotes).values({
      applicationId,
      userId,
      content,
      isPrivate,
    });
    return { message: 'Note added' };
  }
}
