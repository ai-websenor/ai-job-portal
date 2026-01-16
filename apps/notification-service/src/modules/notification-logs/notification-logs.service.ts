import { Injectable, Inject } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '@ai-job-portal/database';
import { DATABASE_CONNECTION } from '../../database/database.module';

@Injectable()
export class NotificationLogsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async logNotification(payload: {
    userId: string;
    notificationType: string;
    channel: 'email' | 'push' | 'sms' | 'whatsapp';
    recipient: string;
    subject?: string;
    message: string;
    status?: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
    metadata?: any;
    errorMessage?: string;
  }): Promise<void> {
    try {
      await this.db.insert(schema.notificationLogs).values({
        userId: payload.userId,
        notificationType: payload.notificationType,
        channel: payload.channel,
        recipient: payload.recipient,
        subject: payload.subject,
        message: payload.message,
        status: payload.status || 'pending',
        metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
        errorMessage: payload.errorMessage,
        createdAt: new Date(),
      } as any);
      // 'as any' used because schema type safety might be strict on enum or optional fields not matching 1:1 with payload without transformation
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }
}
