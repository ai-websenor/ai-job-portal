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
    // Validate that a job application exists between the two users
    await this.validateApplicationAccess(userId, dto.recipientId, dto.jobId, dto.applicationId);

    const participants = [userId, dto.recipientId].sort().join(',');

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
        recipientId: dto.recipientId,
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

    return {
      data: threadsWithMeta,
      meta: {
        total: Number(totalResult[0]?.count || 0),
        page,
        limit,
        totalPages: Math.ceil(Number(totalResult[0]?.count || 0) / limit),
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
   * Validates that a job application exists between the two users before allowing thread creation.
   * Business rule: Candidate must have applied for the employer's job before either party can message.
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

      // Get the employer to find the userId
      const employer = await this.db.query.employers.findFirst({
        where: eq(employers.id, job.employerId),
      });

      if (!employer) {
        throw new NotFoundException('Employer not found');
      }

      // Verify the users match: one must be the jobSeeker, the other the employer
      const isValid =
        (application.jobSeekerId === userId && employer.userId === recipientId) ||
        (application.jobSeekerId === recipientId && employer.userId === userId);

      if (!isValid) {
        throw new ForbiddenException(
          'You can only message users connected through a job application',
        );
      }

      return;
    }

    if (jobId) {
      // Get the job to find the employer
      const job = await this.db.query.jobs.findFirst({
        where: eq(jobs.id, jobId),
      });

      if (!job) {
        throw new NotFoundException('Job not found');
      }

      // Get the employer to find the userId
      const employer = await this.db.query.employers.findFirst({
        where: eq(employers.id, job.employerId),
      });

      if (!employer) {
        throw new NotFoundException('Employer not found');
      }

      // Determine who is the candidate and who is the employer
      let candidateId: string;
      if (employer.userId === userId) {
        candidateId = recipientId;
      } else if (employer.userId === recipientId) {
        candidateId = userId;
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
}
