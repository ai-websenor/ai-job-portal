import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and, isNull, isNotNull, sql } from 'drizzle-orm';
import {
  Database,
  messageThreads,
  jobApplications,
  jobs,
  employers,
  users,
  profiles,
} from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { ThreadAccessHelper } from './thread-access.helper';

@Injectable()
export class ThreadResolutionHelper {
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

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly accessHelper: ThreadAccessHelper,
  ) {}

  /**
   * Resolves the recipientId to a valid users.id.
   * If recipientId is an employers.id (not a users.id), maps it to the employer's userId.
   * This handles the case where the frontend sends employer.id instead of employer.userId.
   */
  async resolveRecipientId(recipientId: string): Promise<string> {
    // First check if it's already a valid user ID
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, recipientId),
    });
    if (user) return recipientId;

    // If not a user ID, check if it's an employer table ID
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.id, recipientId),
    });
    if (employer) return employer.userId;

    // If not an employer ID, check if it's a candidate profile ID
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.id, recipientId),
      columns: { userId: true },
    });
    if (profile) return profile.userId;

    throw new NotFoundException('Recipient not found');
  }

  /**
   * Application thread: one per job application — reuse the thread tied to this
   * application if it exists; otherwise validate the relationship and create it.
   */
  async resolveApplicationThread(
    userId: string,
    recipientId: string,
    participants: string,
    applicationId: string,
  ): Promise<{ thread: typeof messageThreads.$inferSelect; isNew: boolean }> {
    const existingThread = await this.db.query.messageThreads.findFirst({
      where: eq(messageThreads.applicationId, applicationId),
    });
    if (existingThread) {
      if (existingThread.participants.split(',').includes(userId)) {
        return { thread: existingThread, isNew: false };
      }
      // The application thread belongs to someone else (e.g. a colleague at the
      // same company chatting from candidate search). Never inject the sender's
      // messages into a thread they aren't part of — give them their own direct
      // (sourcing) thread instead. Colleagues with company-chat permission can
      // still continue the original thread via sendMessage on its threadId.
      return this.resolveSourcingThread(userId, recipientId, participants);
    }

    // Check if the sender is an employer
    const senderEmployer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
      columns: { id: true },
    });
    const senderRole: 'employer' | 'candidate' = senderEmployer ? 'employer' : 'candidate';
    const createdByEmployerId = senderEmployer?.id || null;

    // New thread: validate application relationship + shortlisted status
    await this.accessHelper.validateApplicationAccess(
      userId,
      recipientId,
      applicationId,
      senderRole,
    );

    // Resolve companyId, jobId for company-level visibility
    let threadCompanyId: string | null = null;
    let threadJobId: string | null = null;

    const app = await this.db.query.jobApplications.findFirst({
      where: eq(jobApplications.id, applicationId),
      columns: { jobId: true },
    });
    if (app) {
      threadJobId = app.jobId;
      const job = await this.db.query.jobs.findFirst({
        where: eq(jobs.id, app.jobId),
        columns: { companyId: true },
      });
      if (job) threadCompanyId = job.companyId;
    }

    try {
      const [newThread] = await this.db
        .insert(messageThreads)
        .values({
          participants,
          applicationId,
          companyId: threadCompanyId,
          jobId: threadJobId,
          createdByEmployerId,
          lastMessageAt: new Date(),
        })
        .returning();
      return { thread: newThread, isNew: true };
    } catch (error: any) {
      // Race condition: another request inserted the thread between our SELECT and INSERT
      if (error.code === '23505') {
        // PostgreSQL unique_violation on uq_message_threads_application
        const thread = await this.db.query.messageThreads.findFirst({
          where: eq(messageThreads.applicationId, applicationId),
        });
        if (thread) {
          if (thread.participants.split(',').includes(userId)) {
            return { thread, isNew: false };
          }
          // Lost the race to a different user — same rule as above
          return this.resolveSourcingThread(userId, recipientId, participants);
        }
      }
      throw error;
    }
  }

  /**
   * Sourcing thread: employer-initiated conversation with a candidate found via
   * candidate search — no application exists yet. One per participant pair per company.
   *
   * Business rules:
   * - Only employers can start a conversation without an applicationId
   * - Candidate must be reachable: public profile, or private profile with an
   *   application to the employer's company (404 otherwise — no existence leak)
   * - Optional jobId context must belong to the sender or their company
   * - Same status rule as application threads: if the candidate has applied to this
   *   employer/company and every application is rejected/withdrawn/offer_rejected,
   *   sourcing outreach is blocked too (no bypass of the application-thread rule).
   *   Pure sourcing (zero applications) is allowed. The candidate can reply freely
   *   since sendMessage only checks thread membership.
   */
  async resolveSourcingThread(
    userId: string,
    recipientId: string,
    participants: string,
    jobId?: string,
  ): Promise<{ thread: typeof messageThreads.$inferSelect; isNew: boolean }> {
    const senderEmployer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
      columns: { id: true, companyId: true },
    });
    if (!senderEmployer) {
      throw new ForbiddenException(
        'Candidates can start a conversation only from a job application.',
      );
    }

    const candidateProfile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, recipientId),
      columns: { id: true, visibility: true },
    });
    if (!candidateProfile) throw new NotFoundException('Candidate profile not found');

    const applicationStatuses = await this.accessHelper.getCompanyApplicationStatuses(
      recipientId,
      senderEmployer,
    );

    if (candidateProfile.visibility === 'private' && applicationStatuses.length === 0) {
      throw new NotFoundException('Candidate profile not found');
    }

    if (
      applicationStatuses.length > 0 &&
      !applicationStatuses.some((status) =>
        ThreadResolutionHelper.EMPLOYER_CHAT_ALLOWED_STATUSES.includes(status),
      )
    ) {
      throw new ForbiddenException(
        'Chat is not allowed for rejected, withdrawn, or offer rejected applications.',
      );
    }

    let threadJobId: string | null = null;
    if (jobId) {
      const job = await this.db.query.jobs.findFirst({
        where: eq(jobs.id, jobId),
        columns: { id: true, employerId: true, companyId: true },
      });
      if (!job) throw new NotFoundException('Job not found');
      const ownsJob =
        job.employerId === senderEmployer.id ||
        (!!senderEmployer.companyId && job.companyId === senderEmployer.companyId);
      if (!ownsJob) throw new ForbiddenException('Job does not belong to you or your company');
      threadJobId = job.id;
    }

    // createdByEmployerId IS NOT NULL keeps legacy NULL-applicationId threads
    // (pre-dating this feature) out of the reuse lookup — never adopted
    const reuseFilter = and(
      eq(messageThreads.participants, participants),
      isNull(messageThreads.applicationId),
      isNotNull(messageThreads.createdByEmployerId),
      senderEmployer.companyId ? eq(messageThreads.companyId, senderEmployer.companyId) : sql`true`,
    );

    const existingThread = await this.db.query.messageThreads.findFirst({ where: reuseFilter });
    if (existingThread) return { thread: existingThread, isNew: false };

    try {
      const [newThread] = await this.db
        .insert(messageThreads)
        .values({
          participants,
          applicationId: null,
          companyId: senderEmployer.companyId,
          jobId: threadJobId,
          createdByEmployerId: senderEmployer.id,
          lastMessageAt: new Date(),
        })
        .returning();
      return { thread: newThread, isNew: true };
    } catch (error: any) {
      // Race condition: unique_violation on uq_message_threads_sourcing
      if (error.code === '23505') {
        const thread = await this.db.query.messageThreads.findFirst({ where: reuseFilter });
        if (thread) return { thread, isNew: false };
      }
      throw error;
    }
  }
}
