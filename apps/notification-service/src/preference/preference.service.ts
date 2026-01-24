import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Database, notificationPreferencesEnhanced } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';

// Channel preferences for each notification category
interface ChannelPrefs {
  email?: boolean;
  push?: boolean;
  sms?: boolean;
}

// Default channel preferences
const DEFAULT_PREFS: ChannelPrefs = { email: true, push: true, sms: false };

@Injectable()
export class PreferenceService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async get(userId: string) {
    let prefs = await this.db.query.notificationPreferencesEnhanced.findFirst({
      where: eq(notificationPreferencesEnhanced.userId, userId),
    });

    if (!prefs) {
      // Create default preferences
      const [created] = await this.db.insert(notificationPreferencesEnhanced).values({
        userId,
        jobAlerts: DEFAULT_PREFS,
        applicationUpdates: DEFAULT_PREFS,
        interviewReminders: DEFAULT_PREFS,
        messages: DEFAULT_PREFS,
        marketing: { email: false, push: false, sms: false },
      }).returning();
      prefs = created;
    }

    return prefs;
  }

  async update(userId: string, dto: Partial<{
    jobAlerts: ChannelPrefs;
    applicationUpdates: ChannelPrefs;
    interviewReminders: ChannelPrefs;
    messages: ChannelPrefs;
    marketing: ChannelPrefs;
  }>) {
    const existing = await this.get(userId);

    await this.db.update(notificationPreferencesEnhanced)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(notificationPreferencesEnhanced.id, existing.id));

    return this.get(userId);
  }
}
