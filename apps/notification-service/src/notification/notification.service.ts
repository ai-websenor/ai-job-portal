import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { Database, notifications } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';

@Injectable()
export class NotificationService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async getUserNotifications(userId: string, limit: number = 50, unreadOnly: boolean = false) {
    const conditions = [eq(notifications.userId, userId)];
    if (unreadOnly) conditions.push(eq(notifications.isRead, false));

    return this.db.query.notifications.findMany({
      where: and(...conditions),
      orderBy: [desc(notifications.createdAt)],
      limit,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await this.db.query.notifications.findMany({
      where: and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
    });
    return result.length;
  }

  async markAsRead(userId: string, notificationId: string) {
    await this.db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));

    return { message: 'Marked as read' };
  }

  async markAllAsRead(userId: string) {
    await this.db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    return { message: 'All marked as read' };
  }

  async create(data: {
    userId: string;
    type: 'application' | 'interview' | 'job' | 'message' | 'system';
    title: string;
    message: string;
    actionUrl?: string;
    data?: Record<string, unknown>;
  }) {
    const [notification] = await this.db.insert(notifications).values({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      actionUrl: data.actionUrl,
      data: data.data ? JSON.stringify(data.data) : null,
    }).returning();

    return notification;
  }

  async delete(userId: string, notificationId: string) {
    await this.db.delete(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));

    return { message: 'Deleted' };
  }

  async deleteAll(userId: string) {
    await this.db.delete(notifications).where(eq(notifications.userId, userId));
    return { message: 'All notifications deleted' };
  }
}
