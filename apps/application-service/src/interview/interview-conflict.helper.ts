import { Injectable, Inject } from '@nestjs/common';
import { eq, ne, and, inArray, sql } from 'drizzle-orm';
import { Database, interviews, jobApplications, jobs, profiles } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { InterviewTimeHelper } from './interview-time.helper';

@Injectable()
export class InterviewConflictHelper {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly timeHelper: InterviewTimeHelper,
  ) {}

  /**
   * Find THIS employer's other interviews whose time window overlaps the given
   * slot — for double-booking detection (a soft warning, not a hard block). Scope
   * is the employer only: every active round (scheduled / confirmed / rescheduled)
   * across all of the employer's jobs and candidates is considered; completed or
   * canceled rounds never conflict. Optionally excludes one interview (used when
   * rescheduling so a round doesn't conflict with itself).
   */
  async findEmployerTimeConflicts(
    employerId: string,
    start: Date,
    durationMinutes: number,
    excludeInterviewId?: string,
  ) {
    const end = new Date(start.getTime() + durationMinutes * 60000);
    const startLit = this.timeHelper.toUtcTimestampLiteral(start);
    const endLit = this.timeHelper.toUtcTimestampLiteral(end);

    const conditions: any[] = [
      eq(jobs.employerId, employerId),
      inArray(interviews.status, ['scheduled', 'confirmed', 'rescheduled'] as any),
      // Half-open overlap test: existingStart < newEnd AND existingEnd > newStart.
      // Bounds bound as explicit timestamp literals to match the no-tz column.
      sql`${interviews.scheduledAt} < ${endLit}::timestamp`,
      sql`${interviews.scheduledAt} + (${interviews.duration} * interval '1 minute') > ${startLit}::timestamp`,
    ];
    if (excludeInterviewId) conditions.push(ne(interviews.id, excludeInterviewId));

    const rows = await this.db
      .select({
        id: interviews.id,
        applicationId: interviews.applicationId,
        scheduledAt: interviews.scheduledAt,
        duration: interviews.duration,
        status: interviews.status,
        interviewType: interviews.interviewType,
        jobTitle: jobs.title,
        candidateFirstName: profiles.firstName,
        candidateLastName: profiles.lastName,
      })
      .from(interviews)
      .innerJoin(jobApplications, eq(interviews.applicationId, jobApplications.id))
      .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
      .leftJoin(profiles, eq(jobApplications.jobSeekerId, profiles.userId))
      .where(and(...conditions));

    return rows.map((r) => ({
      interviewId: r.id,
      applicationId: r.applicationId,
      scheduledAt: r.scheduledAt,
      duration: r.duration,
      status: r.status,
      interviewType: r.interviewType,
      jobTitle: r.jobTitle,
      candidateName: `${r.candidateFirstName || ''} ${r.candidateLastName || ''}`.trim() || null,
    }));
  }
}
