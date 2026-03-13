import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Database, notificationPreferencesEnhanced } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';

const EMAIL_ON = { email: true, push: true, sms: false };
const EMAIL_OFF = { email: false, push: true, sms: false };
const MSG_ON = { email: true, push: true, sms: false };
const MSG_OFF = { email: false, push: false, sms: false };

@Injectable()
export class PreferenceService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  private async getOrCreate(userId: string) {
    let prefs = await this.db.query.notificationPreferencesEnhanced.findFirst({
      where: eq(notificationPreferencesEnhanced.userId, userId),
    });

    if (!prefs) {
      const [created] = await this.db
        .insert(notificationPreferencesEnhanced)
        .values({
          userId,
          jobAlerts: EMAIL_ON,
          applicationUpdates: EMAIL_ON,
          interviewReminders: EMAIL_ON,
          messages: MSG_ON,
          marketing: { email: false, push: false, sms: false },
        })
        .returning();
      prefs = created;
    }

    return prefs;
  }

  async get(userId: string) {
    const prefs = await this.getOrCreate(userId);
    return {
      data: {
        emailNotifications: (prefs.applicationUpdates as any)?.email ?? true,
        messages: (prefs.messages as any)?.email ?? true,
      },
      message: 'Notification preferences retrieved successfully',
    };
  }

  async update(userId: string, dto: { emailNotifications?: boolean; messages?: boolean }) {
    const prefs = await this.getOrCreate(userId);
    const updates: Record<string, any> = { updatedAt: new Date() };

    if (dto.emailNotifications !== undefined) {
      const channelPrefs = dto.emailNotifications ? EMAIL_ON : EMAIL_OFF;
      updates.jobAlerts = channelPrefs;
      updates.applicationUpdates = channelPrefs;
      updates.interviewReminders = channelPrefs;
    }

    if (dto.messages !== undefined) {
      updates.messages = dto.messages ? MSG_ON : MSG_OFF;
    }

    const [updated] = await this.db
      .update(notificationPreferencesEnhanced)
      .set(updates)
      .where(eq(notificationPreferencesEnhanced.id, prefs.id))
      .returning();

    return {
      data: {
        emailNotifications: (updated.applicationUpdates as any)?.email ?? true,
        messages: (updated.messages as any)?.email ?? true,
      },
      message: 'Notification preferences updated successfully',
    };
  }
}
