/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and, desc, sql, like, or, inArray } from 'drizzle-orm';
import {
  Database,
  messageThreads,
  messages,
  jobApplications,
  jobs,
  employers,
  users,
  profiles,
} from '@ai-job-portal/database';
import { S3Service } from '@ai-job-portal/aws';
import { hasCompanyPermission } from '@ai-job-portal/common';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateThreadDto, ThreadQueryDto, UpdateThreadDto } from './dto';
import { getUserProfiles } from '../utils/user.helper';
import { PresenceService } from '../presence/presence.service';

type EmployerContext = {
  id: string;
  companyId: string | null;
  rbacRoleId: string | null;
};

type LatestApplicationSummary = {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  status: string;
  appliedAt: Date;
} | null;

@Injectable()
export class ThreadService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly presenceService: PresenceService,
    private readonly s3Service: S3Service,
  ) {}

  async createThread(userId: string, dto: CreateThreadDto, userRole?: string) {
    // Resolve recipientId: if it's an employers.id rather than a users.id, map it to the correct userId
    const recipientId = await this.resolveRecipientId(dto.recipientId);

    const participants = [userId, recipientId].sort().join(',');

    // Check if a thread already exists between these users (one thread per candidate-employer pair)
    const existingThread = await this.db.query.messageThreads.findFirst({
      where: eq(messageThreads.participants, participants),
    });

    let thread = existingThread;
    const isNew = !existingThread;

    if (!thread) {
      // Check if the sender is an employer
      const senderEmployer = await this.db.query.employers.findFirst({
        where: eq(employers.userId, userId),
        columns: { id: true },
      });
      const senderRole: 'employer' | 'candidate' = senderEmployer ? 'employer' : 'candidate';
      const createdByEmployerId = senderEmployer?.id || null;

      // New thread: validate application relationship + shortlisted status
      await this.validateApplicationAccess(userId, recipientId, dto.applicationId, senderRole);

      // Resolve companyId, jobId for company-level visibility
      let threadCompanyId: string | null = null;
      let threadJobId: string | null = null;

      if (dto.applicationId) {
        const app = await this.db.query.jobApplications.findFirst({
          where: eq(jobApplications.id, dto.applicationId),
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
      }

      const [newThread] = await this.db
        .insert(messageThreads)
        .values({
          participants,
          applicationId: dto.applicationId,
          companyId: threadCompanyId,
          jobId: threadJobId,
          createdByEmployerId,
          lastMessageAt: new Date(),
        })
        .returning();
      thread = newThread;
    }

    // Create initial message
    const [message] = await this.db
      .insert(messages)
      .values({
        threadId: thread.id,
        senderId: userId,
        recipientId,
        body: dto.body,
      })
      .returning();

    // Update thread's last message time
    await this.db
      .update(messageThreads)
      .set({ lastMessageAt: new Date() })
      .where(eq(messageThreads.id, thread.id));

    // Enrich with participant profiles
    const participantIds = thread.participants.split(',');
    const profileMap = await getUserProfiles(this.db, participantIds, this.s3Service);
    const onlineStatus = await this.presenceService.getOnlineStatus(participantIds);

    const enrichedParticipants = participantIds.map((id) => ({
      ...(profileMap.get(id) || {
        id,
        firstName: '',
        lastName: '',
        profilePhoto: null,
        companyName: null,
        companyLogo: null,
      }),
      isOnline: onlineStatus[id] || false,
    }));

    return {
      thread: { ...thread, participants: enrichedParticipants },
      message,
      isNew,
    };
  }

  async getThreads(userId: string, query: ThreadQueryDto, userRole?: string, _scope?: string) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    // Build thread filter — auto-detect company-level visibility
    let threadFilter: any = like(messageThreads.participants, `%${userId}%`);
    let isCompanyViewer = false;
    let _viewerCompanyId: string | null = null;
    let viewerEmployer: EmployerContext | null = null;

    if (userRole) {
      viewerEmployer =
        (await this.db.query.employers.findFirst({
          where: eq(employers.userId, userId),
          columns: { id: true, companyId: true, rbacRoleId: true },
        })) ?? null;

      if (viewerEmployer?.companyId) {
        const hasPermission = await hasCompanyPermission(
          this.db,
          viewerEmployer.rbacRoleId,
          userRole,
          'company-chat:read',
        );

        if (hasPermission) {
          isCompanyViewer = true;
          _viewerCompanyId = viewerEmployer.companyId;
          // Show own threads OR any thread belonging to the same company
          threadFilter = or(
            like(messageThreads.participants, `%${userId}%`),
            eq(messageThreads.companyId, viewerEmployer.companyId),
          );
        }
      }
    }

    const threads = await this.db.query.messageThreads.findMany({
      where: and(
        threadFilter,
        query.archived !== undefined ? eq(messageThreads.isArchived, query.archived) : sql`true`,
      ),
      orderBy: [desc(messageThreads.lastMessageAt)],
      limit,
      offset,
      with: {
        messages: {
          orderBy: [desc(messages.createdAt)],
          limit: 1,
        },
      },
    });

    // Collect all participant IDs for batch profile fetch
    const allParticipantIds: string[] = [];
    for (const thread of threads) {
      allParticipantIds.push(...thread.participants.split(','));
    }
    const uniqueParticipantIds = [...new Set(allParticipantIds)];

    const [profileMap, onlineStatus] = await Promise.all([
      getUserProfiles(this.db, uniqueParticipantIds, this.s3Service),
      this.presenceService.getOnlineStatus(uniqueParticipantIds),
    ]);

    // Get unread counts for each thread
    const threadsWithMeta = await Promise.all(
      threads.map(async (thread) => {
        const participantIds = thread.participants.split(',');
        const isDirectParticipant = participantIds.includes(userId);

        // For company viewers who are not direct participants, count unread
        // messages addressed to the employer participant (the company representative)
        let unreadRecipientId = userId;
        if (!isDirectParticipant && isCompanyViewer) {
          // Find the employer participant in this thread (the one from the same company)
          const employerParticipant = participantIds.find((id) => {
            const profile = profileMap.get(id);
            return profile?.role === 'employer';
          });
          if (employerParticipant) {
            unreadRecipientId = employerParticipant;
          }
        }

        const unreadCount = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(
            and(
              eq(messages.threadId, thread.id),
              eq(messages.recipientId, unreadRecipientId),
              eq(messages.isRead, false),
            ),
          );

        const enrichedParticipants = participantIds.map((id) => ({
          ...(profileMap.get(id) || {
            id,
            firstName: '',
            lastName: '',
            profilePhoto: null,
            companyName: null,
            companyLogo: null,
            role: null,
          }),
          isOnline: onlineStatus[id] || false,
        }));

        const candidateParticipantId = this.getCandidateParticipantId(
          participantIds,
          profileMap,
          userId,
        );
        const latestApplication =
          viewerEmployer && candidateParticipantId
            ? await this.getLatestApplicationForEmployer(candidateParticipantId, viewerEmployer)
            : null;

        return {
          ...thread,
          participants: enrichedParticipants,
          lastMessage: thread.messages?.[0] || null,
          unreadCount: Number(unreadCount[0]?.count || 0),
          latestApplication,
        };
      }),
    );

    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(messageThreads)
      .where(
        and(
          threadFilter,
          query.archived !== undefined ? eq(messageThreads.isArchived, query.archived) : sql`true`,
        ),
      );

    const total = Number(totalResult[0]?.count || 0);
    const pageCount = Math.ceil(total / limit);

    return {
      data: threadsWithMeta,
      pagination: {
        totalThread: total,
        pageCount,
        currentPage: page,
        hasNextPage: page < pageCount,
      },
    };
  }

  async getThread(userId: string, threadId: string, userRole?: string) {
    const thread = await this.db.query.messageThreads.findFirst({
      where: eq(messageThreads.id, threadId),
    });

    if (!thread) throw new NotFoundException('Thread not found');
    if (!thread.participants.includes(userId)) {
      // Check company-level chat access
      let hasAccess = false;
      if (userRole && thread.companyId) {
        const employer = await this.db.query.employers.findFirst({
          where: eq(employers.userId, userId),
          columns: { id: true, companyId: true, rbacRoleId: true },
        });
        if (employer?.companyId === thread.companyId) {
          hasAccess = await hasCompanyPermission(
            this.db,
            employer.rbacRoleId,
            userRole,
            'company-chat:read',
          );
        }
      }
      if (!hasAccess) {
        throw new ForbiddenException('Not authorized to view this thread');
      }
    }

    const participantIds = thread.participants.split(',');
    const [profileMap, onlineStatus] = await Promise.all([
      getUserProfiles(this.db, participantIds, this.s3Service),
      this.presenceService.getOnlineStatus(participantIds),
    ]);

    const enrichedParticipants = participantIds.map((id) => ({
      ...(profileMap.get(id) || {
        id,
        firstName: '',
        lastName: '',
        profilePhoto: null,
        companyName: null,
        companyLogo: null,
      }),
      isOnline: onlineStatus[id] || false,
    }));

    return { ...thread, participants: enrichedParticipants };
  }

  private getCandidateParticipantId(
    participantIds: string[],
    profileMap: Awaited<ReturnType<typeof getUserProfiles>>,
    viewerUserId: string,
  ): string | null {
    const candidateParticipant = participantIds.find(
      (id) => profileMap.get(id)?.role === 'candidate',
    );

    if (candidateParticipant) return candidateParticipant;

    return (
      participantIds.find((id) => id !== viewerUserId && profileMap.get(id)?.role !== 'employer') ||
      null
    );
  }

  private async getLatestApplicationForEmployer(
    candidateUserId: string,
    employer: EmployerContext,
  ): Promise<LatestApplicationSummary> {
    const ownershipFilter = employer.companyId
      ? eq(jobs.companyId, employer.companyId)
      : eq(jobs.employerId, employer.id);

    const [latestApplication] = await this.db
      .select({
        applicationId: jobApplications.id,
        jobId: jobs.id,
        jobTitle: jobs.title,
        status: jobApplications.status,
        appliedAt: jobApplications.appliedAt,
      })
      .from(jobApplications)
      .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
      .where(and(eq(jobApplications.jobSeekerId, candidateUserId), ownershipFilter))
      .orderBy(desc(jobApplications.appliedAt))
      .limit(1);

    return latestApplication || null;
  }

  async updateThread(userId: string, threadId: string, dto: UpdateThreadDto) {
    await this.getThread(userId, threadId);

    await this.db.update(messageThreads).set(dto).where(eq(messageThreads.id, threadId));

    return this.getThread(userId, threadId);
  }

  async deleteThread(userId: string, threadId: string) {
    await this.getThread(userId, threadId);

    // Soft delete by archiving
    await this.db
      .update(messageThreads)
      .set({ isArchived: true })
      .where(eq(messageThreads.id, threadId));

    return { success: true };
  }

  /**
   * Resolves the recipientId to a valid users.id.
   * If recipientId is an employers.id (not a users.id), maps it to the employer's userId.
   * This handles the case where the frontend sends employer.id instead of employer.userId.
   */
  private async resolveRecipientId(recipientId: string): Promise<string> {
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
   * Validates that a job application exists between the two users and that at least one
   * application has been shortlisted before allowing thread creation.
   *
   * Business rules:
   * - A job application must exist between the candidate and the employer's company
   * - At least one application must have a shortlisted (or post-shortlisted) status
   * - Company-level access: Any employer from the same company can message candidates
   */
  private async validateApplicationAccess(
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

  /** Employer can chat at any stage except rejected/withdrawn */
  private static readonly EMPLOYER_CHAT_ALLOWED_STATUSES = [
    'applied',
    'viewed',
    'shortlisted',
    'interview_scheduled',
    'interview_completed',
    'hired',
    'offer_accepted',
    'offer_rejected',
  ];

  /** Candidate can chat only after shortlisting */
  private static readonly CANDIDATE_CHAT_ALLOWED_STATUSES = [
    'shortlisted',
    'interview_scheduled',
    'interview_completed',
    'hired',
    'offer_accepted',
    'offer_rejected',
  ];

  private async validateShortlistedStatus(
    candidateUserId: string,
    companyId: string | null,
    employerId: string,
    senderRole: 'employer' | 'candidate',
  ) {
    const allowedStatuses =
      senderRole === 'employer'
        ? ThreadService.EMPLOYER_CHAT_ALLOWED_STATUSES
        : ThreadService.CANDIDATE_CHAT_ALLOWED_STATUSES;

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
          ? 'Chat is not allowed for rejected or withdrawn applications.'
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
