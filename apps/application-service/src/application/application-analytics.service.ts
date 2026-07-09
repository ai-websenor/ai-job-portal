import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { eq, and, sql, inArray, gt } from 'drizzle-orm';
import {
  Database,
  jobApplications,
  profiles,
  profileViews,
  employers,
  jobs,
  interviews,
} from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';

@Injectable()
export class ApplicationAnalyticsService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

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
            sql`${jobApplications.status} IN ('interview_scheduled', 'interview_rescheduled')`,
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
}
