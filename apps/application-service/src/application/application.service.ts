import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {PostgresJsDatabase} from 'drizzle-orm/postgres-js';
import {eq, and, sql, desc} from 'drizzle-orm';
import * as schema from '@ai-job-portal/database';
import {DATABASE_CONNECTION} from '../database/database.module';
import {ManualApplyDto} from './dto/manual-apply.dto';
import {QuickApplyDto} from './dto/quick-apply.dto';
import {MyJobsResponseDto} from './dto/my-jobs-response.dto';

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
        data: application,
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

    return {
      message: 'Applied jobs retrieved successfully',
      data: formattedApplications,
    };
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
        notes: schema.jobApplications.notes,
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
      notes: applicant.notes || null,
    }));

    return {
      message: 'Applicants retrieved successfully',
      data: formattedApplicants,
    };
  }

  async getApplicationsForJob(jobId: string, user: any, status?: string) {
    // 1. Get employer profile
    const [employer] = await this.db
      .select()
      .from(schema.employers)
      .where(eq(schema.employers.userId, user.id))
      .limit(1);

    if (!employer) {
      throw new BadRequestException('Employer profile not found');
    }

    // 2. Validate job exists and belongs to employer
    const [job] = await this.db
      .select()
      .from(schema.jobs)
      .where(eq(schema.jobs.id, jobId))
      .limit(1);

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (job.employerId !== employer.id) {
      throw new ForbiddenException('You do not have permission to view applications for this job');
    }

    // 3. Build where condition for applications
    let whereCondition = eq(schema.jobApplications.jobId, jobId);

    // Add status filter if provided
    if (status) {
      whereCondition = and(whereCondition, eq(schema.jobApplications.status, status as any)) as any;
    }

    // 4. Query applications with joins
    const applications = await this.db
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
      .orderBy(desc(schema.jobApplications.appliedAt));

    // 5. Format response
    const formattedApplications = applications.map((app) => ({
      applicationId: app.applicationId,
      jobId: app.jobId,
      jobTitle: app.jobTitle,
      candidateId: app.candidateId,
      candidateName: `${app.candidateFirstName} ${app.candidateLastName}`,
      candidateEmail: app.candidateEmail,
      resumeUrl: app.resumeUrl || null,
      status: app.status,
      appliedAt: app.appliedAt,
      viewedAt: app.viewedAt || null,
      screeningAnswers: app.screeningAnswers || null,
    }));

    return {
      message: 'Job applications retrieved successfully',
      data: formattedApplications,
    };
  }

  async getMyJobs(user: any): Promise<{message: string; data: MyJobsResponseDto[]}> {
    // 1. Get employerId from user
    const userId = user.id;
    const userEmail = user.email;

    // Fetch the employer profile using the authenticated userId
    let [employer] = await this.db
      .select()
      .from(schema.employers)
      .where(eq(schema.employers.userId, userId))
      .limit(1);

    // Fallback: If not found by ID, try finding by email
    if (!employer && userEmail) {
      const [userRecord] = await this.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, userEmail))
        .limit(1);

      if (userRecord) {
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

    if (!employer) {
      throw new BadRequestException(
        'Employer profile not found. Please ensure you are logged in as an employer.',
      );
    }

    // 2. Fetch all jobs created by this employer
    const jobs = await this.db
      .select({
        id: schema.jobs.id,
        title: schema.jobs.title,
        jobType: schema.jobs.jobType,
        deadline: schema.jobs.deadline,
        isActive: schema.jobs.isActive,
        applicationCount: schema.jobs.applicationCount,
        createdAt: schema.jobs.createdAt,
      })
      .from(schema.jobs)
      .where(eq(schema.jobs.employerId, employer.id))
      .orderBy(desc(schema.jobs.createdAt));

    // 3. Map to response DTO with calculated status and remaining days
    const now = new Date();
    const myJobs: MyJobsResponseDto[] = jobs.map((job) => {
      let status: 'Active' | 'Inactive' | 'Expired';
      let daysRemaining = 0;

      // Calculate status
      if (job.deadline && job.deadline < now) {
        status = 'Expired';
        daysRemaining = 0;
      } else if (!job.isActive) {
        status = 'Inactive';
        // Calculate remaining days even for inactive jobs
        if (job.deadline) {
          const diffTime = job.deadline.getTime() - now.getTime();
          daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        }
      } else {
        status = 'Active';
        // Calculate remaining days
        if (job.deadline) {
          const diffTime = job.deadline.getTime() - now.getTime();
          daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        }
      }

      return {
        jobId: job.id,
        title: job.title,
        jobType: job.jobType,
        applicationsCount: job.applicationCount,
        status,
        daysRemaining,
      };
    });

    return {
      message: 'Employer jobs retrieved successfully',
      data: myJobs,
    };
  }
}
