import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, sql, like } from 'drizzle-orm';
import {
  Database,
  messageThreads,
  messages,
  jobApplications,
  jobs,
  employers,
  users,
} from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateThreadDto, ThreadQueryDto, UpdateThreadDto } from './dto';
import { getUserProfiles } from '../utils/user.helper';
import { PresenceService } from '../presence/presence.service';

@Injectable()
export class ThreadService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly presenceService: PresenceService,
  ) {}

  async createThread(userId: string, dto: CreateThreadDto) {
    // Resolve recipientId: if it's an employers.id rather than a users.id, map it to the correct userId
    const recipientId = await this.resolveRecipientId(dto.recipientId);

    // Validate that a job application exists between the two users
    await this.validateApplicationAccess(userId, recipientId, dto.jobId, dto.applicationId);

    const participants = [userId, recipientId].sort().join(',');

    // Check if thread already exists between these users for same job/application
    const existingThread = await this.db.query.messageThreads.findFirst({
      where: and(
        eq(messageThreads.participants, participants),
        dto.jobId ? eq(messageThreads.jobId, dto.jobId) : sql`true`,
        dto.applicationId ? eq(messageThreads.applicationId, dto.applicationId) : sql`true`,
      ),
    });

    let thread = existingThread;

    if (!thread) {
      const [newThread] = await this.db
        .insert(messageThreads)
        .values({
          participants,
          jobId: dto.jobId,
          applicationId: dto.applicationId,
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
        subject: dto.subject,
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
    const profileMap = await getUserProfiles(this.db, participantIds);
    const onlineStatus = await this.presenceService.getOnlineStatus(participantIds);

    const enrichedParticipants = participantIds.map((id) => ({
      ...(profileMap.get(id) || { id, firstName: '', lastName: '', profilePhoto: null }),
      isOnline: onlineStatus[id] || false,
    }));

    return {
      thread: { ...thread, participants: enrichedParticipants },
      message,
    };
  }

  async getThreads(userId: string, query: ThreadQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const threads = await this.db.query.messageThreads.findMany({
      where: and(
        like(messageThreads.participants, `%${userId}%`),
        query.archived !== undefined ? eq(messageThreads.isArchived, query.archived) : sql`true`,
        query.jobId ? eq(messageThreads.jobId, query.jobId) : sql`true`,
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
      getUserProfiles(this.db, uniqueParticipantIds),
      this.presenceService.getOnlineStatus(uniqueParticipantIds),
    ]);

    // Get unread counts for each thread
    const threadsWithMeta = await Promise.all(
      threads.map(async (thread) => {
        const unreadCount = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(
            and(
              eq(messages.threadId, thread.id),
              eq(messages.recipientId, userId),
              eq(messages.isRead, false),
            ),
          );

        const participantIds = thread.participants.split(',');
        const enrichedParticipants = participantIds.map((id) => ({
          ...(profileMap.get(id) || { id, firstName: '', lastName: '', profilePhoto: null }),
          isOnline: onlineStatus[id] || false,
        }));

        return {
          ...thread,
          participants: enrichedParticipants,
          lastMessage: thread.messages?.[0] || null,
          unreadCount: Number(unreadCount[0]?.count || 0),
        };
      }),
    );

    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(messageThreads)
      .where(like(messageThreads.participants, `%${userId}%`));

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

  async getThread(userId: string, threadId: string) {
    const thread = await this.db.query.messageThreads.findFirst({
      where: eq(messageThreads.id, threadId),
    });

    if (!thread) throw new NotFoundException('Thread not found');
    if (!thread.participants.includes(userId)) {
      throw new ForbiddenException('Not authorized to view this thread');
    }

    const participantIds = thread.participants.split(',');
    const [profileMap, onlineStatus] = await Promise.all([
      getUserProfiles(this.db, participantIds),
      this.presenceService.getOnlineStatus(participantIds),
    ]);

    const enrichedParticipants = participantIds.map((id) => ({
      ...(profileMap.get(id) || { id, firstName: '', lastName: '', profilePhoto: null }),
      isOnline: onlineStatus[id] || false,
    }));

    return { ...thread, participants: enrichedParticipants };
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

    throw new NotFoundException('Recipient not found');
  }

  /**
   * Validates that a job application exists between the two users before allowing thread creation.
   * Business rule: Candidate must have applied for the employer's job before either party can message.
   * Company-level access: Any employer from the same company as the job poster can message candidates.
   */
  private async validateApplicationAccess(
    userId: string,
    recipientId: string,
    jobId?: string,
    applicationId?: string,
  ) {
    if (!jobId && !applicationId) {
      throw new BadRequestException(
        'Either jobId or applicationId is required to start a conversation',
      );
    }

    if (applicationId) {
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

      // Direct match: one user is the jobSeeker, the other is the job poster
      const isDirectMatch =
        (application.jobSeekerId === userId && jobEmployer.userId === recipientId) ||
        (application.jobSeekerId === recipientId && jobEmployer.userId === userId);

      if (isDirectMatch) return;

      // Company-level match: the sender/recipient is an employer in the same company
      if (jobEmployer.companyId) {
        const isCompanyMatch = await this.checkCompanyEmployerAccess(
          userId,
          recipientId,
          application.jobSeekerId,
          jobEmployer.companyId,
        );
        if (isCompanyMatch) return;
      }

      throw new ForbiddenException(
        'You can only message users connected through a job application',
      );
    }

    if (jobId) {
      // Get the job to find the employer
      const job = await this.db.query.jobs.findFirst({
        where: eq(jobs.id, jobId),
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

      // Determine who is the candidate and who is the employer
      let candidateId: string;
      if (jobEmployer.userId === userId) {
        candidateId = recipientId;
      } else if (jobEmployer.userId === recipientId) {
        candidateId = userId;
      } else if (jobEmployer.companyId) {
        // Check if either participant is an employer from the same company
        const senderEmployer = await this.db.query.employers.findFirst({
          where: and(eq(employers.userId, userId), eq(employers.companyId, jobEmployer.companyId)),
        });
        if (senderEmployer) {
          candidateId = recipientId;
        } else {
          const recipientEmployer = await this.db.query.employers.findFirst({
            where: and(
              eq(employers.userId, recipientId),
              eq(employers.companyId, jobEmployer.companyId),
            ),
          });
          if (recipientEmployer) {
            candidateId = userId;
          } else {
            throw new ForbiddenException('Neither participant is an employer for this job');
          }
        }
      } else {
        throw new ForbiddenException('Neither participant is the employer for this job');
      }

      // Check if the candidate has applied for this job
      const application = await this.db.query.jobApplications.findFirst({
        where: and(eq(jobApplications.jobId, jobId), eq(jobApplications.jobSeekerId, candidateId)),
      });

      if (!application) {
        throw new ForbiddenException('Candidate must have applied for this job before messaging');
      }
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
