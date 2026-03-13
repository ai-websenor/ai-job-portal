import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { Database, notifications, users } from '@ai-job-portal/database';
import { CustomLogger } from '@ai-job-portal/logger';
import { DATABASE_CLIENT } from '../database/database.module';
import { PushService } from '../push/push.service';

@Injectable()
export class NotificationService {
  private readonly logger = new CustomLogger();

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly pushService: PushService,
  ) {}

  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false,
  ) {
    const conditions = [eq(notifications.userId, userId)];
    if (unreadOnly) conditions.push(eq(notifications.isRead, false));

    const offset = (page - 1) * limit;

    const data = await this.db.query.notifications.findMany({
      where: and(...conditions),
      orderBy: [desc(notifications.createdAt)],
      limit,
      offset,
    });

    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(...conditions));

    const totalNotification = Number(countResult[0]?.count || 0);
    const pageCount = Math.ceil(totalNotification / limit);

    return {
      data,
      message: 'Notifications retrieved successfully',
      pagination: {
        totalNotification,
        pageCount,
        currentPage: page,
        hasNextPage: page < pageCount,
      },
    };
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

  async sendTestPushToUser(
    userId: string,
    title = 'Test Notification',
    message = 'This notification is related to testing push notifications',
  ) {
    // Create in-app notification
    await this.create({
      userId,
      type: 'system',
      channel: 'push',
      title,
      message,
      metadata: { isTest: true },
    });

    // Send FCM push notification
    const sentCount = await this.pushService.sendToUser(userId, title, message, {
      type: 'TEST_PUSH',
    });

    this.logger.log(
      `Test push sent to user ${userId}, delivered to ${sentCount} device(s)`,
      'NotificationService',
    );

    return {
      message: 'Test push notification sent successfully',
      data: { sentToDevices: sentCount },
    };
  }

  async sendTestPushToAll(
    title = 'Test Notification',
    message = 'This notification is related to testing push notifications',
  ) {
    // Fetch all registered candidates and employers
    const allUsers = await this.db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.role, ['candidate', 'employer', 'super_employer']));

    const totalUsers = allUsers.length;

    // Process in background to avoid gateway timeout (30s)
    this.processTestPushBroadcast(allUsers, title, message);

    return {
      message: `Test push notification is being sent to ${totalUsers} user(s) in the background`,
      data: { totalUsers },
    };
  }

  private async processTestPushBroadcast(
    allUsers: { id: string }[],
    title: string,
    message: string,
  ) {
    let totalDevices = 0;
    let notifiedUsers = 0;
    const batchSize = 50;

    for (let i = 0; i < allUsers.length; i += batchSize) {
      const batch = allUsers.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (user) => {
          try {
            await this.create({
              userId: user.id,
              type: 'system',
              channel: 'push',
              title,
              message,
              metadata: { isTest: true, isBroadcast: true },
            });

            const sentCount = await this.pushService.sendToUser(user.id, title, message, {
              type: 'TEST_PUSH_BROADCAST',
            });

            totalDevices += sentCount;
            notifiedUsers++;
          } catch (error: any) {
            this.logger.error(
              `Failed to send test push to user ${user.id}: ${error.message}`,
              'NotificationService',
            );
          }
        }),
      );
    }

    this.logger.log(
      `Test broadcast push completed: ${notifiedUsers}/${allUsers.length} user(s), ${totalDevices} device(s)`,
      'NotificationService',
    );
  }
}
