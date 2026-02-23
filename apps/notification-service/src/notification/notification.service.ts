import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { Database, notifications } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';

@Injectable()
export class NotificationService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async getUserNotifications(userId: string, limit: number = 50, unreadOnly: boolean = false) {
    const conditions = [eq(notifications.userId, userId)];
    if (unreadOnly) conditions.push(eq(notifications.isRead, false));

    const data = await this.db.query.notifications.findMany({
      where: and(...conditions),
      orderBy: [desc(notifications.createdAt)],
      limit,
    });

    return { data, message: 'Notifications retrieved successfully' };
  }

  async getUnreadCount(userId: string) {
    const result = await this.db.query.notifications.findMany({
      where: and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
    });
    return { data: { count: result.length }, message: 'Unread count retrieved successfully' };
  }

  async markAsRead(userId: string, notificationId: string) {
    await this.db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));

    return { message: 'Notification marked as read' };
  }

  async markAllAsRead(userId: string) {
    await this.db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    return { message: 'All notifications marked as read' };
  }

  async create(data: {
    userId: string;
    type: 'job_alert' | 'application_update' | 'interview' | 'message' | 'system';
    channel: 'email' | 'sms' | 'whatsapp' | 'push';
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    const [notification] = await this.db
      .insert(notifications)
      .values({
        userId: data.userId,
        type: data.type as any,
        channel: data.channel as any,
        title: data.title,
        message: data.message,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      })
      .returning();

    return { data: notification, message: 'Notification created successfully' };
  }

  async delete(userId: string, notificationId: string) {
    await this.db
      .delete(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));

    return { message: 'Notification deleted successfully' };
  }

  async deleteAll(userId: string) {
    await this.db.delete(notifications).where(eq(notifications.userId, userId));
    return { message: 'All notifications deleted successfully' };
  }
}
