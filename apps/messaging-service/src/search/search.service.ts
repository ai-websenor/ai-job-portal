import { Injectable, Inject } from '@nestjs/common';
import { eq, and, or, desc, sql, ilike } from 'drizzle-orm';
import { Database, messages, messageThreads } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { SearchMessagesDto } from './dto';
import { getUserProfiles } from '../utils/user.helper';

@Injectable()
export class SearchService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async searchMessages(userId: string, dto: SearchMessagesDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const offset = (page - 1) * limit;

    const pattern = `%${dto.q}%`;

    // Build conditions: user must be sender or recipient + search term matches
    const accessCondition = or(eq(messages.senderId, userId), eq(messages.recipientId, userId));

    const searchCondition = or(ilike(messages.body, pattern), ilike(messages.subject, pattern));

    const threadCondition = dto.threadId ? eq(messages.threadId, dto.threadId) : sql`true`;

    const whereCondition = and(accessCondition, searchCondition, threadCondition);

    const [results, countResult] = await Promise.all([
      this.db.query.messages.findMany({
        where: whereCondition,
        orderBy: [desc(messages.createdAt)],
        limit,
        offset,
      }),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(whereCondition),
    ]);

    // Collect unique user IDs for batch profile fetch
    const userIds = new Set<string>();
    for (const msg of results) {
      userIds.add(msg.senderId);
      userIds.add(msg.recipientId);
    }
    const profileMap = await getUserProfiles(this.db, [...userIds]);

    // Collect thread IDs for context
    const threadIds = [...new Set(results.map((msg) => msg.threadId))];
    const threadMap = new Map<string, any>();
    if (threadIds.length > 0) {
      for (const tid of threadIds) {
        const thread = await this.db.query.messageThreads.findFirst({
          where: eq(messageThreads.id, tid),
        });
        if (thread) {
          threadMap.set(tid, {
            id: thread.id,
            jobId: thread.jobId,
            applicationId: thread.applicationId,
          });
        }
      }
    }

    const enrichedResults = results.map((msg) => ({
      ...msg,
      attachments: msg.attachments ? JSON.parse(msg.attachments) : null,
      sender: profileMap.get(msg.senderId) || null,
      recipient: profileMap.get(msg.recipientId) || null,
      thread: threadMap.get(msg.threadId) || null,
    }));

    const total = Number(countResult[0]?.count || 0);

    return {
      message: 'Messages searched successfully',
      data: enrichedResults,
      pagination: {
        totalMessage: total,
        pageCount: Math.ceil(total / limit),
        currentPage: page,
        hasNextPage: page * limit < total,
      },
    };
  }
}
