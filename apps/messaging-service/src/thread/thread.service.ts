/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and, desc, sql, like, ilike, or, inArray } from 'drizzle-orm';
import { Database, messageThreads, messages, jobs, employers } from '@ai-job-portal/database';
import { S3Service } from '@ai-job-portal/aws';
import { hasCompanyPermission } from '@ai-job-portal/common';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateThreadDto, ThreadQueryDto, UpdateThreadDto } from './dto';
import { getUserProfiles } from '../utils/user.helper';
import { PresenceService } from '../presence/presence.service';
import {
  getEmployerContext,
  getJobMeta,
  type EmployerContext,
} from '../utils/latest-application.helper';
import { ThreadResolutionHelper } from './thread-resolution.helper';

@Injectable()
export class ThreadService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly presenceService: PresenceService,
    private readonly s3Service: S3Service,
    private readonly resolutionHelper: ThreadResolutionHelper,
  ) {}

  async createThread(userId: string, dto: CreateThreadDto, userRole?: string) {
    const recipientId = await this.resolutionHelper.resolveRecipientId(dto.recipientId);

    const participants = [userId, recipientId].sort().join(',');

    const { thread, isNew } = dto.applicationId
      ? await this.resolutionHelper.resolveApplicationThread(
          userId,
          recipientId,
          participants,
          dto.applicationId,
        )
      : await this.resolutionHelper.resolveSourcingThread(
          userId,
          recipientId,
          participants,
          dto.jobId,
        );

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
        phone: null,
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
    let viewerEmployer: EmployerContext | null = null;

    if (userRole) {
      viewerEmployer = await getEmployerContext(this.db, userId);

      if (viewerEmployer?.companyId) {
        const hasPermission = await hasCompanyPermission(
          this.db,
          viewerEmployer.rbacRoleId,
          userRole,
          'company-chat:read',
        );

        if (hasPermission) {
          isCompanyViewer = true;
          // Show own threads OR any thread belonging to the same company
          threadFilter = or(
            like(messageThreads.participants, `%${userId}%`),
            eq(messageThreads.companyId, viewerEmployer.companyId),
          );
        }
      }
    }

    const whereClause = and(
      threadFilter,
      query.archived !== undefined ? eq(messageThreads.isArchived, query.archived) : sql`true`,
      // Phase 2: employer inbox filter by job (disambiguates duplicate job titles)
      query.jobId ? eq(messageThreads.jobId, query.jobId) : sql`true`,
      // Employer: limit to threads for jobs this recruiter owns (jobs.employerId)
      // OR threads this recruiter created (covers sourcing threads with no jobId)
      query.ownJobsOnly && viewerEmployer?.id
        ? or(
            inArray(
              messageThreads.jobId,
              this.db
                .select({ id: jobs.id })
                .from(jobs)
                .where(eq(jobs.employerId, viewerEmployer.id)),
            ),
            eq(messageThreads.createdByEmployerId, viewerEmployer.id),
          )
        : sql`true`,
    );

    const threads = await this.db.query.messageThreads.findMany({
      where: whereClause,
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

    const [profileMap, onlineStatus, jobMetaMap] = await Promise.all([
      getUserProfiles(this.db, uniqueParticipantIds, this.s3Service),
      this.presenceService.getOnlineStatus(uniqueParticipantIds),
      getJobMeta(
        this.db,
        threads.map((t) => t.jobId).filter((id): id is string => !!id),
      ),
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
            phone: null,
            profilePhoto: null,
            companyName: null,
            companyLogo: null,
            role: null,
          }),
          isOnline: onlineStatus[id] || false,
        }));

        const job = thread.jobId ? jobMetaMap.get(thread.jobId) : null;
        // Employer view only: does the viewing recruiter own this job (jobs.employerId)?
        const isOwnJob =
          viewerEmployer?.id && job?.employerId ? job.employerId === viewerEmployer.id : false;

        return {
          ...thread,
          participants: enrichedParticipants,
          jobId: thread.jobId,
          jobTitle: job?.title ?? null,
          jobStatus: job?.status ?? null,
          isOwnJob,
          lastMessage: thread.messages?.[0] || null,
          lastMessageAt: thread.lastMessageAt,
          unreadCount: Number(unreadCount[0]?.count || 0),
        };
      }),
    );

    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(messageThreads)
      .where(whereClause);

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

  /**
   * Phase 2: distinct jobs present in the employer's inbox, for the job-name filter dropdown.
   * Returns jobId + title + status so the frontend can render "Title #SHORTCODE" and filter by jobId
   * (duplicate titles disambiguated by jobId). Candidate-side returns an empty list (no filtering).
   */
  async getJobFilters(userId: string, userRole?: string, search?: string) {
    const viewerEmployer = userRole ? await getEmployerContext(this.db, userId) : null;
    if (!viewerEmployer?.companyId) return { data: [] };

    // Server-side searchable dropdown: match either the job title (ILIKE) or the
    // 12-char short code shown to the user (last 12 chars of the jobId, dashes removed).
    const term = search?.trim();
    const searchClause = term
      ? or(
          ilike(jobs.title, `%${term}%`),
          sql`right(replace(${messageThreads.jobId}::text, '-', ''), 12) ILIKE ${`%${term}%`}`,
        )
      : undefined;

    const rows = await this.db
      .selectDistinct({
        jobId: messageThreads.jobId,
        jobTitle: jobs.title,
        jobStatus: jobs.status,
      })
      .from(messageThreads)
      .innerJoin(jobs, eq(messageThreads.jobId, jobs.id))
      .where(and(eq(messageThreads.companyId, viewerEmployer.companyId), searchClause))
      .limit(50);

    return { data: rows };
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
        phone: null,
        profilePhoto: null,
        companyName: null,
        companyLogo: null,
      }),
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
}
