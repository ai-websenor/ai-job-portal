import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CustomLogger } from '@ai-job-portal/logger';
import { eq, and, desc, sql, inArray, not } from 'drizzle-orm';
import {
  Database,
  messages,
  messageThreads,
  users,
  employers,
  jobApplications,
  jobs,
} from '@ai-job-portal/database';
import { SqsService, S3Service } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import { SendMessageDto, MessageQueryDto, MarkReadDto, MAX_ATTACHMENT_SIZE } from './dto';
import { getUserProfiles } from '../utils/user.helper';
import { hasCompanyPermission } from '@ai-job-portal/common';
import { getEmployerContext, getJobMeta } from '../utils/latest-application.helper';

@Injectable()
export class MessageService {
  private readonly logger = new CustomLogger();

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly sqsService: SqsService,
    private readonly s3Service: S3Service,
  ) {}

  async sendMessage(userId: string, threadId: string, dto: SendMessageDto, userRole?: string) {
    // Verify thread exists and user is participant (or has company-level access)
    const thread = await this.db.query.messageThreads.findFirst({
      where: eq(messageThreads.id, threadId),
    });

    if (!thread) throw new NotFoundException('Thread not found');

    const participants = thread.participants.split(',');
    const isDirectParticipant = participants.includes(userId);

    if (!isDirectParticipant) {
      // Company-level chat access fallback for employers with write permission
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
        throw new ForbiddenException('Not authorized to send messages in this thread');
      }
    }

    // Validate chat is still enabled (not rejected/withdrawn/offer_rejected)
    await this.validateChatEnabled(thread);

    // For direct participants, recipient is the other participant.
    // For company-level senders, recipient is the candidate (non-employer participant).
    let recipientId: string;
    if (isDirectParticipant) {
      recipientId = participants.find((p) => p !== userId) || participants[0];
    } else {
      // Find the candidate participant (the one who is NOT an employer in this company)
      const employerParticipants = await this.db
        .select({ userId: employers.userId })
        .from(employers)
        .where(
          and(inArray(employers.userId, participants), eq(employers.companyId, thread.companyId!)),
        );
      const employerUserIds = new Set(employerParticipants.map((e) => e.userId));
      recipientId = participants.find((p) => !employerUserIds.has(p)) || participants[0];
    }

    // Create message + bump thread's last message time atomically
    const [message] = await this.db.transaction(async (tx) => {
      const [createdMessage] = await tx
        .insert(messages)
        .values({
          threadId,
          senderId: userId,
          recipientId,
          body: dto.body,
          attachments: dto.attachments ? JSON.stringify(dto.attachments) : null,
          status: 'sent',
        })
        .returning();

      await tx
        .update(messageThreads)
        .set({ lastMessageAt: new Date() })
        .where(eq(messageThreads.id, threadId));

      return [createdMessage];
    });

    // Send push notification to recipient
    const sender = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { firstName: true, lastName: true },
    });
    const senderName = sender ? `${sender.firstName} ${sender.lastName}`.trim() : 'Someone';

    const hasAttachments = dto.attachments && dto.attachments.length > 0;
    const attachmentCount = dto.attachments?.length || 0;

    const logMsg = hasAttachments
      ? `📎 Message sent with ${attachmentCount} attachment(s)`
      : '💬 Message sent';

    this.logger.success(logMsg, 'MessageService', {
      messageId: message.id,
      threadId,
      senderId: userId,
      recipientId,
      hasAttachments,
      attachmentCount,
      attachmentNames: dto.attachments?.map((a) => a.name).join(', ') || '',
    });

    this.sqsService
      .sendNewMessageNotification({
        recipientId,
        senderId: userId,
        senderName,
        threadId,
        messagePreview: hasAttachments
          ? `📎 ${dto.body?.substring(0, 80) || `Sent ${attachmentCount} attachment(s)`}`
          : dto.body?.substring(0, 100) || '',
      })
      .catch((err) =>
        this.logger.error(`Failed to send notification: ${err.message}`, 'MessageService'),
      );

    return message;
  }

  async getMessages(userId: string, threadId: string, query: MessageQueryDto, userRole?: string) {
    // Verify access
    const thread = await this.db.query.messageThreads.findFirst({
      where: eq(messageThreads.id, threadId),
    });

    if (!thread) throw new NotFoundException('Thread not found');
    const viewerEmployer = userRole ? await getEmployerContext(this.db, userId) : null;

    if (!thread.participants.includes(userId)) {
      // Company-level chat access fallback
      let hasAccess = false;
      if (userRole && thread.companyId && viewerEmployer?.companyId === thread.companyId) {
        hasAccess = await hasCompanyPermission(
          this.db,
          viewerEmployer.rbacRoleId,
          userRole,
          'company-chat:read',
        );
      }
      if (!hasAccess) {
        throw new ForbiddenException('Not authorized to view messages');
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const offset = (page - 1) * limit;

    const [msgs, totalResult] = await Promise.all([
      this.db.query.messages.findMany({
        where: and(
          eq(messages.threadId, threadId),
          query.unreadOnly ? eq(messages.isRead, false) : sql`true`,
        ),
        orderBy: [desc(messages.createdAt)],
        limit,
        offset,
      }),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(eq(messages.threadId, threadId)),
    ]);

    // Resolve participant profiles
    const participants = thread.participants.split(',');
    const isDirectParticipant = participants.includes(userId);

    // For company-level viewers, fetch all participants + the viewer
    const profileIds = isDirectParticipant ? participants : [...participants, userId];
    const profileMap = await getUserProfiles(this.db, profileIds, this.s3Service);

    // Determine opponent: for direct participants, it's the other person.
    // For company viewers, the opponent is the candidate (non-employer participant).
    let opponentId: string;
    if (isDirectParticipant) {
      opponentId = participants.find((p) => p !== userId) || participants[0];
    } else {
      opponentId =
        participants.find((id) => profileMap.get(id)?.role === 'candidate') || participants[0];
    }

    // Side-based alignment: for employer viewers (direct participant OR company-level
    // viewer), every message NOT sent by the candidate is "own side" — this keeps
    // colleague messages (sent via company-chat permission into this thread) on the
    // employer side instead of mixing with the candidate's. Candidates only ever see
    // their own messages as "own".
    const viewerIsEmployer = !!viewerEmployer;

    // Parse attachments with signed URLs and add isOwn flag
    const enrichedMessages = await Promise.all(
      msgs.map(async (msg) => ({
        id: msg.id,
        threadId: msg.threadId,
        senderId: msg.senderId,
        recipientId: msg.recipientId,
        body: msg.body,
        attachments: await this.signAttachments(msg.attachments),
        status: msg.status,
        isRead: msg.isRead,
        readAt: msg.readAt,
        deliveredAt: msg.deliveredAt,
        createdAt: msg.createdAt,
        isOwn: viewerIsEmployer ? msg.senderId !== opponentId : msg.senderId === userId,
      })),
    );

    const job = thread.jobId ? (await getJobMeta(this.db, [thread.jobId])).get(thread.jobId) : null;

    // Employer view only: does the viewing recruiter own this job (jobs.employerId)?
    const isOwnJob =
      viewerEmployer?.id && job?.employerId ? job.employerId === viewerEmployer.id : false;

    const total = Number(totalResult[0]?.count || 0);
    const pageCount = Math.ceil(total / limit);

    return {
      data: {
        participants: {
          self: profileMap.get(userId) || null,
          opponent: profileMap.get(opponentId) || null,
        },
        jobId: thread.jobId,
        jobTitle: job?.title ?? null,
        jobStatus: job?.status ?? null,
        isOwnJob,
        messages: enrichedMessages,
      },
      pagination: {
        totalMessage: total,
        pageCount,
        currentPage: page,
        hasNextPage: page < pageCount,
      },
    };
  }

  async markAsRead(userId: string, dto: MarkReadDto) {
    // Verify user is recipient of these messages
    const messagesToMark = await this.db.query.messages.findMany({
      where: and(inArray(messages.id, dto.messageIds), eq(messages.recipientId, userId)),
    });

    if (messagesToMark.length === 0) {
      return { updated: 0 };
    }

    const idsToUpdate = messagesToMark.map((m) => m.id);

    await this.db
      .update(messages)
      .set({ isRead: true, readAt: new Date(), status: 'read' })
      .where(inArray(messages.id, idsToUpdate));

    return { updated: idsToUpdate.length };
  }

  async markThreadAsRead(userId: string, threadId: string, userRole?: string) {
    // Verify access
    const thread = await this.db.query.messageThreads.findFirst({
      where: eq(messageThreads.id, threadId),
    });

    if (!thread) throw new NotFoundException('Thread not found');
    if (!thread.participants.includes(userId)) {
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
        throw new ForbiddenException('Not authorized');
      }
    }

    await this.db
      .update(messages)
      .set({ isRead: true, readAt: new Date(), status: 'read' })
      .where(
        and(
          eq(messages.threadId, threadId),
          eq(messages.recipientId, userId),
          eq(messages.isRead, false),
        ),
      );

    return { success: true };
  }

  async markAsDelivered(messageIds: string[]) {
    if (!messageIds.length) return;

    await this.db
      .update(messages)
      .set({ status: 'delivered', deliveredAt: new Date() })
      .where(and(inArray(messages.id, messageIds), eq(messages.status, 'sent')));
  }

  async getUnreadCount(userId: string) {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(and(eq(messages.recipientId, userId), eq(messages.isRead, false)));

    return { unreadCount: Number(result[0]?.count || 0) };
  }

  /**
   * Replaces plain S3 URLs in attachments with time-limited signed download URLs.
   * Only authenticated thread participants can trigger this (access checked by caller).
   */
  async signAttachments(attachmentsJson: string | null): Promise<any[] | null> {
    if (!attachmentsJson) return null;

    const attachments = JSON.parse(attachmentsJson);
    if (!Array.isArray(attachments) || attachments.length === 0) return null;

    return Promise.all(
      attachments.map(async (att: any) => ({
        ...att,
        url: att.url ? await this.s3Service.getSignedDownloadUrlFromKeyOrUrl(att.url) : att.url,
      })),
    );
  }

  async generateAttachmentUploadUrl(fileName: string, contentType: string, fileSize?: number) {
    if (fileSize && fileSize > MAX_ATTACHMENT_SIZE) {
      this.logger.error('📎 Attachment rejected: file size exceeds limit', 'MessageService', {
        fileName,
        contentType,
        fileSize,
        maxSize: MAX_ATTACHMENT_SIZE,
      });
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${MAX_ATTACHMENT_SIZE / (1024 * 1024)} MB`,
      );
    }

    const key = this.s3Service.generateKey('message-attachments', fileName);
    const expiresIn = 3600;
    const uploadUrl = await this.s3Service.getSignedUploadUrl(key, contentType, expiresIn);
    const fileUrl = await this.s3Service.getSignedDownloadUrl(key, expiresIn);

    this.logger.success('📎 Attachment upload URL generated', 'MessageService', {
      fileName,
      contentType,
      fileSize: fileSize || 'unknown',
      key,
    });

    return { uploadUrl, fileUrl, key, expiresIn };
  }

  /**
   * Checks if chat is still allowed for the application linked to this thread.
   * Rejected/withdrawn applications → read-only (existing messages visible, new messages blocked).
   */
  // offer_rejected is also view-only; existing messages remain visible.
  private static readonly CHAT_DISABLED_STATUSES: any[] = [
    'rejected',
    'withdrawn',
    'offer_rejected',
  ];

  private static readonly DISABLED_REASONS: Record<string, string> = {
    rejected: 'Chat disabled because the application was rejected.',
    withdrawn: 'Chat disabled because the application was withdrawn.',
    offer_rejected: 'Chat disabled because the offer was rejected.',
  };

  private async validateChatEnabled(thread: any): Promise<void> {
    // Per-thread gating: each thread is isolated to its own application, so the chat
    // enabled/disabled state follows that specific application's status.
    if (thread.applicationId) {
      const [app] = await this.db
        .select({ status: jobApplications.status })
        .from(jobApplications)
        .where(eq(jobApplications.id, thread.applicationId))
        .limit(1);

      if (app && MessageService.CHAT_DISABLED_STATUSES.includes(app.status)) {
        throw new ForbiddenException(
          MessageService.DISABLED_REASONS[app.status] || 'Chat disabled for this application.',
        );
      }
      return;
    }

    // Legacy fallback (threads created before per-application isolation, application_id IS NULL):
    // allow chat if ANY application between candidate and company is in an active status.
    const participantIds = thread.participants.split(',');

    // Find the candidate and employer from participants
    let candidateUserId: string | null = null;
    let employerId: string | null = null;

    const matchedEmployers = await this.db.query.employers.findMany({
      where: inArray(employers.userId, participantIds),
      columns: { id: true, userId: true, companyId: true },
    });
    const employerByUserId = new Map(matchedEmployers.map((emp) => [emp.userId, emp]));

    for (const id of participantIds) {
      const employer = employerByUserId.get(id);
      if (employer) {
        employerId = employer.id;
      } else {
        candidateUserId = id;
      }
    }

    if (!candidateUserId || !employerId) return; // Can't determine, allow

    // Check if ANY application between this candidate and employer/company has an allowed status
    // If the latest application is in a blocked status, check if there's another active one
    const activeApplication = await this.db
      .select({ id: jobApplications.id })
      .from(jobApplications)
      .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
      .innerJoin(employers, eq(jobs.employerId, employers.id))
      .where(
        and(
          eq(jobApplications.jobSeekerId, candidateUserId),
          thread.companyId
            ? eq(employers.companyId, thread.companyId)
            : eq(employers.id, employerId),
          not(inArray(jobApplications.status, MessageService.CHAT_DISABLED_STATUSES)),
        ),
      )
      .limit(1);

    // If ALL applications are in disabled statuses, block chat
    if (activeApplication.length === 0) {
      // Get the latest application status for a meaningful error message
      const [latest] = await this.db
        .select({ status: jobApplications.status })
        .from(jobApplications)
        .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
        .innerJoin(employers, eq(jobs.employerId, employers.id))
        .where(
          and(
            eq(jobApplications.jobSeekerId, candidateUserId),
            thread.companyId
              ? eq(employers.companyId, thread.companyId)
              : eq(employers.id, employerId),
          ),
        )
        .orderBy(desc(jobApplications.appliedAt))
        .limit(1);

      if (latest) {
        throw new ForbiddenException(
          MessageService.DISABLED_REASONS[latest.status] || 'Chat disabled for this application.',
        );
      }
    }
  }
}
