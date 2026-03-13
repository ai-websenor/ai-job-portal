import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CustomLogger } from '@ai-job-portal/logger';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { Database, messages, messageThreads, users } from '@ai-job-portal/database';
import { SqsService, S3Service } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import { SendMessageDto, MessageQueryDto, MarkReadDto, MAX_ATTACHMENT_SIZE } from './dto';
import { getUserProfiles } from '../utils/user.helper';

@Injectable()
export class MessageService {
  private readonly logger = new CustomLogger();

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly sqsService: SqsService,
    private readonly s3Service: S3Service,
  ) {}

  async sendMessage(userId: string, threadId: string, dto: SendMessageDto) {
    // Verify thread exists and user is participant
    const thread = await this.db.query.messageThreads.findFirst({
      where: eq(messageThreads.id, threadId),
    });

    if (!thread) throw new NotFoundException('Thread not found');

    const participants = thread.participants.split(',');
    if (!participants.includes(userId)) {
      throw new ForbiddenException('Not authorized to send messages in this thread');
    }

    const recipientId = participants.find((p) => p !== userId) || participants[0];

    const [message] = await this.db
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

    // Update thread's last message time
    await this.db
      .update(messageThreads)
      .set({ lastMessageAt: new Date() })
      .where(eq(messageThreads.id, threadId));

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

  async getMessages(userId: string, threadId: string, query: MessageQueryDto) {
    // Verify access
    const thread = await this.db.query.messageThreads.findFirst({
      where: eq(messageThreads.id, threadId),
    });

    if (!thread) throw new NotFoundException('Thread not found');
    if (!thread.participants.includes(userId)) {
      throw new ForbiddenException('Not authorized to view messages');
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const offset = (page - 1) * limit;

    const msgs = await this.db.query.messages.findMany({
      where: and(
        eq(messages.threadId, threadId),
        query.unreadOnly ? eq(messages.isRead, false) : sql`true`,
      ),
      orderBy: [desc(messages.createdAt)],
      limit,
      offset,
    });

    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(eq(messages.threadId, threadId));

    // Resolve participant profiles
    const participants = thread.participants.split(',');
    const opponentId = participants.find((p) => p !== userId) || participants[0];
    const profileMap = await getUserProfiles(this.db, [userId, opponentId], this.s3Service);

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
        isOwn: msg.senderId === userId,
      })),
    );

    const total = Number(totalResult[0]?.count || 0);
    const pageCount = Math.ceil(total / limit);

    return {
      data: {
        participants: {
          self: profileMap.get(userId) || null,
          opponent: profileMap.get(opponentId) || null,
        },
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

  async markThreadAsRead(userId: string, threadId: string) {
    // Verify access
    const thread = await this.db.query.messageThreads.findFirst({
      where: eq(messageThreads.id, threadId),
    });

    if (!thread) throw new NotFoundException('Thread not found');
    if (!thread.participants.includes(userId)) {
      throw new ForbiddenException('Not authorized');
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
}
