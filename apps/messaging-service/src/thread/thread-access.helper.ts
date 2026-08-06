import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and, or, inArray } from 'drizzle-orm';
import { Database, jobApplications, jobs, employers } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';

@Injectable()
export class ThreadAccessHelper {
  /** Employer can chat at any stage except rejected/withdrawn/offer_rejected */
  private static readonly EMPLOYER_CHAT_ALLOWED_STATUSES = [
    'applied',
    'viewed',
    'shortlisted',
    'interview_scheduled',
    'interview_rescheduled',
    'interview_cancelled',
    'interview_completed',
    'hired',
    'offer_accepted',
  ];

  /** Candidate can chat only after shortlisting */
  private static readonly CANDIDATE_CHAT_ALLOWED_STATUSES = [
    'shortlisted',
    'interview_scheduled',
    'interview_rescheduled',
    'interview_cancelled',
    'interview_completed',
    'hired',
    'offer_accepted',
  ];

  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  /**
   * Statuses of all applications by the candidate to jobs owned by this employer
   * (directly or via the employer's company). Empty array = never applied.
   * Drives both the private-profile reachability rule (mirrors the candidate-profile
   * endpoint in user-service) and the rejected/withdrawn sourcing gate.
   */
  async getCompanyApplicationStatuses(
    candidateUserId: string,
    employer: { id: string; companyId: string | null },
  ): Promise<string[]> {
    const ownership = employer.companyId
      ? or(eq(jobs.employerId, employer.id), eq(jobs.companyId, employer.companyId))
      : eq(jobs.employerId, employer.id);

    const rows = await this.db
      .select({ status: jobApplications.status })
      .from(jobApplications)
      .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
      .where(and(eq(jobApplications.jobSeekerId, candidateUserId), ownership));

    return rows.map((r) => r.status);
  }

  /**
   * Validates that a job application exists between the two users and that at least one
   * application has been shortlisted before allowing thread creation.
   *
   * Business rules:
   * - A job application must exist between the candidate and the employer's company
   * - At least one application must have a shortlisted (or post-shortlisted) status
   * - Company-level access: Any employer from the same company can message candidates
   */
  async validateApplicationAccess(
    userId: string,
    recipientId: string,
    applicationId: string,
    senderRole: 'employer' | 'candidate',
  ) {
    // Look up the application directly
    const application = await this.db.query.jobApplications.findFirst({
      where: eq(jobApplications.id, applicationId),
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Get the job to find the employer
    const job = await this.db.query.jobs.findFirst({
      where: eq(jobs.id, application.jobId),
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Get the employer who posted the job
    const jobEmployer = await this.db.query.employers.findFirst({
      where: eq(employers.id, job.employerId),
    });

    if (!jobEmployer) {
      throw new NotFoundException('Employer not found');
    }

    // Determine candidate and employer context
    let candidateUserId: string | null = null;
    let companyId: string | null = jobEmployer.companyId;

    // Direct match: one user is the jobSeeker, the other is the job poster
    const isDirectMatch =
      (application.jobSeekerId === userId && jobEmployer.userId === recipientId) ||
      (application.jobSeekerId === recipientId && jobEmployer.userId === userId);

    if (isDirectMatch) {
      candidateUserId = application.jobSeekerId;
    }

    // Company-level match: the sender/recipient is an employer in the same company
    if (!candidateUserId && jobEmployer.companyId) {
      const isCompanyMatch = await this.checkCompanyEmployerAccess(
        userId,
        recipientId,
        application.jobSeekerId,
        jobEmployer.companyId,
      );
      if (isCompanyMatch) {
        candidateUserId = application.jobSeekerId;
      }
    }

    if (!candidateUserId) {
      throw new ForbiddenException(
        'No application exists between you and this user. Chat is not allowed.',
      );
    }

    // Check if any application between this candidate and the employer's company
    // has a shortlisted (or post-shortlisted) status
    await this.validateShortlistedStatus(candidateUserId, companyId, job.employerId, senderRole);
  }

  private async validateShortlistedStatus(
    candidateUserId: string,
    companyId: string | null,
    employerId: string,
    senderRole: 'employer' | 'candidate',
  ) {
    const allowedStatuses =
      senderRole === 'employer'
        ? ThreadAccessHelper.EMPLOYER_CHAT_ALLOWED_STATUSES
        : ThreadAccessHelper.CANDIDATE_CHAT_ALLOWED_STATUSES;

    // Find any application between candidate and employer (or their company) with allowed status
    const shortlistedApplication = await this.db
      .select({ id: jobApplications.id })
      .from(jobApplications)
      .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
      .innerJoin(employers, eq(jobs.employerId, employers.id))
      .where(
        and(
          eq(jobApplications.jobSeekerId, candidateUserId),
          companyId ? eq(employers.companyId, companyId) : eq(employers.id, employerId),
          inArray(jobApplications.status, allowedStatuses as any),
        ),
      )
      .limit(1);

    if (shortlistedApplication.length === 0) {
      const errorMessage =
        senderRole === 'employer'
          ? 'Chat is not allowed for rejected, withdrawn, or offer rejected applications.'
          : 'You can start conversation once the employer shortlists your application.';
      throw new ForbiddenException(errorMessage);
    }
  }

  /**
   * Checks if either userId or recipientId is an employer from the same company,
   * and the other is the job seeker.
   */
  private async checkCompanyEmployerAccess(
    userId: string,
    recipientId: string,
    jobSeekerId: string,
    companyId: string,
  ): Promise<boolean> {
    // Case 1: userId is a company employer, recipientId is the job seeker
    if (recipientId === jobSeekerId) {
      const senderEmployer = await this.db.query.employers.findFirst({
        where: and(eq(employers.userId, userId), eq(employers.companyId, companyId)),
      });
      if (senderEmployer) return true;
    }

    // Case 2: recipientId is a company employer, userId is the job seeker
    if (userId === jobSeekerId) {
      const recipientEmployer = await this.db.query.employers.findFirst({
        where: and(eq(employers.userId, recipientId), eq(employers.companyId, companyId)),
      });
      if (recipientEmployer) return true;
    }

    return false;
  }
}
