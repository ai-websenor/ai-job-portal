import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import * as schema from '@ai-job-portal/database';
import { DATABASE_CONNECTION } from '../database/database.module.js';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto.js';

@Injectable()
export class InterviewService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject('NOTIFICATION_SERVICE') private readonly client: ClientProxy,
  ) {}

  async scheduleInterview(employerId: string, dto: ScheduleInterviewDto) {
    const {
      candidateId,
      jobId,
      scheduledAt,
      durationMinutes,
      meetingType,
      meetingTool,
      meetingLink,
      location,
      notes,
    } = dto;

    // 1. Validate Job Application exists
    const [application] = await this.db
      .select()
      .from(schema.jobApplications)
      .where(
        and(
          eq(schema.jobApplications.jobId, jobId),
          eq(schema.jobApplications.jobSeekerId, candidateId),
        ),
      )
      .limit(1);

    if (!application) {
      throw new NotFoundException('Job application not found for this candidate and job.');
    }

    // 2. Validate Employer owns the job
    const [job] = await this.db
      .select()
      .from(schema.jobs)
      .where(eq(schema.jobs.id, jobId))
      .limit(1);

    if (!job) {
      throw new NotFoundException('Job not found.');
    }

    // Check if employer matches. We need strict ownership.
    // EmployerID is in jobs table.
    // We also need to verify the user (employerId passed in) corresponds to the employer record of the job.
    // But wait, employerId passed in is usually the User ID from JWT? Or the Employer Profile ID?
    // The previous code in ApplicationService used:
    // const [employer] = await this.db.select().from(schema.employers).where(eq(schema.employers.userId, user.id))...
    // AND then checked job.employerId === employer.id.
    // The `employerId` arg here comes from Controller, which extracts it from Request.
    // I should ensure the Controller passes the EMPLOYER PROFILE ID, or the USER ID and I fetch the PROFILE ID here.
    // Let's assume Controller passes the User ID (request.user.id) and I fetch the Employer Profile here for safety.

    // FETCH EMPLOYER PROFILE
    const [employerProfile] = await this.db
      .select()
      .from(schema.employers)
      .where(eq(schema.employers.userId, employerId))
      .limit(1);

    if (!employerProfile) {
      throw new ForbiddenException('User is not a registered employer.');
    }

    if (job.employerId !== employerProfile.id) {
      throw new ForbiddenException(
        'You do not have permission to schedule interviews for this job.',
      );
    }

    // 3. Transactional Write
    const interview = await this.db.transaction(async (tx) => {
      // A. Create Interview Record
      const [newInterview] = await tx
        .insert(schema.interviews)
        .values({
          applicationId: application.id,
          jobId: jobId,
          employerId: employerProfile.id,
          candidateId: candidateId,
          scheduledAt: new Date(scheduledAt),
          durationMinutes: durationMinutes,
          meetingType: meetingType,
          meetingTool: meetingTool || null,
          meetingLink: meetingLink || null, // null if not provided
          location: location || null,
          notes: notes || null,
          status: 'scheduled',
        })
        .returning();

      // B. Create Participants
      await tx.insert(schema.interviewParticipants).values([
        {
          interviewId: newInterview.id,
          userId: employerId, // User ID of employer
          role: 'employer',
        },
        {
          interviewId: newInterview.id,
          userId: candidateId, // User ID of candidate
          role: 'candidate',
        },
      ]);

      // C. Update Application Status
      await tx
        .update(schema.jobApplications)
        .set({ status: 'interview_scheduled' }) // Ensure this matches enum
        .where(eq(schema.jobApplications.id, application.id));

      return newInterview;
    });

    // 4. Emit Event
    try {
      this.client.emit('INTERVIEW_SCHEDULED', {
        event: 'INTERVIEW_SCHEDULED',
        interviewId: interview.id,
        applicationId: application.id,
        jobId: jobId,
        employerId: employerProfile.id,
        candidateId: candidateId,
        scheduledAt: scheduledAt,
        durationMinutes: durationMinutes,
      });
    } catch (e) {
      // Log error but don't fail the request as per "Notification service ... MUST NOT be used directly" / "No notification logic involved"
      // But we specified "Emit event". If emission fails, we might want to log it.
      console.error('Failed to emit INTERVIEW_SCHEDULED event', e);
    }

    return interview;
  }

  async getInterviews(userId: string, role: string) {
    // Role: 'employer' or 'candidate'
    if (role === 'employer') {
      // Need Employer Profile ID first
      const [employerProfile] = await this.db
        .select()
        .from(schema.employers)
        .where(eq(schema.employers.userId, userId))
        .limit(1);

      if (!employerProfile) return [];

      return this.db
        .select()
        .from(schema.interviews)
        .where(eq(schema.interviews.employerId, employerProfile.id));
    } else if (role === 'candidate') {
      return this.db
        .select()
        .from(schema.interviews)
        .where(eq(schema.interviews.candidateId, userId));
    }
    return [];
  }
}
