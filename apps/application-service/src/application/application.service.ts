import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql } from 'drizzle-orm';
import * as schema from '@ai-job-portal/database';
import { DATABASE_CONNECTION } from '../database/database.module';
import { ManualApplyDto } from './dto/manual-apply.dto';
import { QuickApplyDto } from './dto/quick-apply.dto';

@Injectable()
export class ApplicationService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async quickApply(jobId: string, quickApplyDto: QuickApplyDto, user: any) {
    // 1. Validate that the job exists and is active
    const job = await this.db.query.jobs.findFirst({
      where: eq(schema.jobs.id, jobId),
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (!job.isActive) {
      throw new BadRequestException('This job is no longer accepting applications');
    }

    // 2. Check that the candidate has resume_details
    const [candidate] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .limit(1);

    if (!candidate || !candidate.resumeDetails) {
      throw new BadRequestException('Please complete your resume before applying to jobs');
    }

    // 3. Insert job application record
    try {
      const [application] = await this.db
        .insert(schema.jobApplications)
        .values({
          jobId: jobId,
          jobSeekerId: user.id,
          status: 'applied',
          coverLetter: quickApplyDto.coverLetter || null,
          screeningAnswers: quickApplyDto.screeningAnswers || null,
          resumeSnapshot: candidate.resumeDetails,
        } as any)
        .returning();

      // 4. Increment application count atomically
      await this.db
        .update(schema.jobs)
        .set({
          applicationCount: sql`${schema.jobs.applicationCount} + 1`,
        })
        .where(eq(schema.jobs.id, jobId));

      return {
        message: 'Application submitted successfully',
        application,
      };
    } catch (error: any) {
      // Handle duplicate application (unique constraint violation)
      // Check both error.code and error.cause.code as Drizzle may nest the error
      if (error.code === '23505' || error.cause?.code === '23505') {
        // PostgreSQL unique violation error code
        throw new ConflictException('You have already applied to this job');
      }
      throw error;
    }
  }

  async manualApply(jobId: string, manualApplyDto: ManualApplyDto, user: any) {
    // 1. Validate consent
    if (!manualApplyDto.agreeConsent) {
      throw new BadRequestException('You must agree to the consent to apply for this job');
    }

    // 2. Validate that the job exists and is active
    const job = await this.db.query.jobs.findFirst({
      where: eq(schema.jobs.id, jobId),
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (!job.isActive) {
      throw new BadRequestException('This job is no longer accepting applications');
    }

    // Check if job deadline has passed
    if (job.deadline && new Date(job.deadline) < new Date()) {
      throw new BadRequestException('This job is no longer accepting applications');
    }

    // 3. Check for duplicate application
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
      throw new ConflictException('Already applied for this job');
    }

    // 4. Validate resume exists and belongs to user
    const [resume] = await this.db
      .select()
      .from(schema.resumes)
      .where(eq(schema.resumes.id, manualApplyDto.resumeId))
      .limit(1);

    if (!resume) {
      throw new BadRequestException('Invalid resume selected');
    }

    // Verify resume belongs to the authenticated user
    const [userProfile] = await this.db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, user.id))
      .limit(1);

    if (!userProfile || resume.profileId !== userProfile.id) {
      throw new BadRequestException('Invalid resume selected');
    }

    // 5. Create application in a transaction
    try {
      await this.db.transaction(async (tx) => {
        // Insert application record
        await tx.insert(schema.jobApplications).values({
          jobId: jobId,
          jobSeekerId: user.id,
          status: 'applied',
          coverLetter: manualApplyDto.coverLetter || null,
          resumeUrl: resume.filePath,
          resumeSnapshot: resume.parsedContent || null,
        } as any);

        // Increment application count
        await tx
          .update(schema.jobs)
          .set({
            applicationCount: sql`${schema.jobs.applicationCount} + 1`,
          })
          .where(eq(schema.jobs.id, jobId));

        // Remove from saved jobs if exists
        await tx
          .delete(schema.savedJobs)
          .where(and(eq(schema.savedJobs.jobId, jobId), eq(schema.savedJobs.jobSeekerId, user.id)));
      });

      return {
        message: 'Job applied successfully',
      };
    } catch (error: any) {
      // Handle duplicate application (unique constraint violation)
      if (error.code === '23505' || error.cause?.code === '23505') {
        throw new ConflictException('Already applied for this job');
      }
      throw error;
    }
  }

  async getMyApplications(user: any, status?: string) {
    // Build the where condition
    let whereCondition = eq(schema.jobApplications.jobSeekerId, user.id);

    // Add status filter if provided
    if (status) {
      whereCondition = and(whereCondition, eq(schema.jobApplications.status, status as any)) as any;
    }

    // Query applications with job details
    const applications = await this.db
      .select({
        applicationId: schema.jobApplications.id,
        jobId: schema.jobs.id,
        jobTitle: schema.jobs.title,
        employerId: schema.jobs.employerId,
        city: schema.jobs.city,
        state: schema.jobs.state,
        jobType: schema.jobs.jobType,
        status: schema.jobApplications.status,
        appliedAt: schema.jobApplications.appliedAt,
        viewedAt: schema.jobApplications.viewedAt,
      })
      .from(schema.jobApplications)
      .innerJoin(schema.jobs, eq(schema.jobApplications.jobId, schema.jobs.id))
      .where(whereCondition)
      .orderBy(sql`${schema.jobApplications.appliedAt} DESC`);

    // Format the response
    const formattedApplications = applications.map((app) => ({
      applicationId: app.applicationId,
      jobId: app.jobId,
      jobTitle: app.jobTitle,
      employerId: app.employerId,
      location:
        app.city && app.state ? `${app.city}, ${app.state}` : app.city || app.state || 'N/A',
      jobType: app.jobType,
      status: app.status,
      appliedAt: app.appliedAt,
      viewedAt: app.viewedAt,
    }));

    return formattedApplications;
  }

  async getAllApplicantsForEmployer(user: any, status?: string) {
    // 1. Get employer ID from user
    const [employer] = await this.db
      .select()
      .from(schema.employers)
      .where(eq(schema.employers.userId, user.id))
      .limit(1);

    if (!employer) {
      throw new BadRequestException('Employer profile not found');
    }

    // 2. Build where condition
    let whereCondition = eq(schema.jobs.employerId, employer.id);

    // Add status filter if provided
    if (status) {
      whereCondition = and(whereCondition, eq(schema.jobApplications.status, status as any)) as any;
    }

    // 3. Query applications with joins
    const applicants = await this.db
      .select({
        applicationId: schema.jobApplications.id,
        jobId: schema.jobs.id,
        jobTitle: schema.jobs.title,
        candidateId: schema.users.id,
        candidateFirstName: schema.users.firstName,
        candidateLastName: schema.users.lastName,
        candidateEmail: schema.users.email,
        resumeUrl: schema.jobApplications.resumeUrl,
        status: schema.jobApplications.status,
        appliedAt: schema.jobApplications.appliedAt,
        viewedAt: schema.jobApplications.viewedAt,
        screeningAnswers: schema.jobApplications.screeningAnswers,
      })
      .from(schema.jobApplications)
      .innerJoin(schema.jobs, eq(schema.jobApplications.jobId, schema.jobs.id))
      .innerJoin(schema.users, eq(schema.jobApplications.jobSeekerId, schema.users.id))
      .where(whereCondition)
      .orderBy(sql`${schema.jobApplications.appliedAt} DESC`);

    // 4. Format the response
    const formattedApplicants = applicants.map((applicant) => ({
      applicationId: applicant.applicationId,
      jobId: applicant.jobId,
      jobTitle: applicant.jobTitle,
      candidateId: applicant.candidateId,
      candidateName: `${applicant.candidateFirstName} ${applicant.candidateLastName}`,
      candidateEmail: applicant.candidateEmail,
      resumeUrl: applicant.resumeUrl || null,
      status: applicant.status,
      appliedAt: applicant.appliedAt,
      viewedAt: applicant.viewedAt || null,
      screeningAnswers: applicant.screeningAnswers || null,
    }));

    return formattedApplicants;
  }
}
