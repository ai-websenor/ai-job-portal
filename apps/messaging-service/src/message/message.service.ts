import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CustomLogger } from '@ai-job-portal/logger';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { Database, messages, messageThreads, users } from '@ai-job-portal/database';
import { SqsService } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import { SendMessageDto, MessageQueryDto, MarkReadDto } from './dto';
import { getUserProfiles } from '../utils/user.helper';

@Injectable()
export class MessageService {
  private readonly logger = new CustomLogger();

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly sqsService: SqsService,
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
        subject: dto.subject,
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

    this.sqsService
      .sendNewMessageNotification({
        recipientId,
        senderId: userId,
        senderName,
        threadId,
        messagePreview: dto.body?.substring(0, 100) || '',
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

    // Collect unique user IDs for batch profile fetch
    const userIds = new Set<string>();
    for (const msg of msgs) {
      userIds.add(msg.senderId);
      userIds.add(msg.recipientId);
    }
    const profileMap = await getUserProfiles(this.db, [...userIds]);

    // Parse attachments and enrich with profiles
    const enrichedMessages = msgs.map((msg) => ({
      ...msg,
      attachments: msg.attachments ? JSON.parse(msg.attachments) : null,
      sender: profileMap.get(msg.senderId) || null,
      recipient: profileMap.get(msg.recipientId) || null,
    }));

    const total = Number(totalResult[0]?.count || 0);
    const pageCount = Math.ceil(total / limit);

    return {
      data: enrichedMessages,
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
}
