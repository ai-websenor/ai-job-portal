import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Database, notificationPreferencesEnhanced } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';

// Channel preferences for each notification category
interface ChannelPrefs {
  email?: boolean;
  push?: boolean;
  sms?: boolean;
  whatsapp?: boolean;
}

// Default channel preferences — WhatsApp is ON by default (candidates can opt out)
const DEFAULT_PREFS: ChannelPrefs = { email: true, push: true, sms: false, whatsapp: true };

@Injectable()
export class PreferenceService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async get(userId: string) {
    let prefs = await this.db.query.notificationPreferencesEnhanced.findFirst({
      where: eq(notificationPreferencesEnhanced.userId, userId),
    });

    if (!prefs) {
      // Create default preferences
      const [created] = await this.db
        .insert(notificationPreferencesEnhanced)
        .values({
          userId,
          jobAlerts: DEFAULT_PREFS,
          applicationUpdates: DEFAULT_PREFS,
          interviewReminders: DEFAULT_PREFS,
          messages: DEFAULT_PREFS,
          marketing: { email: false, push: false, sms: false, whatsapp: false },
        })
        .returning();
      prefs = created;
    }

    return { data: prefs, message: 'Notification preferences retrieved successfully' };
  }

  async update(
    userId: string,
    dto: Partial<{
      jobAlerts: ChannelPrefs;
      applicationUpdates: ChannelPrefs;
      interviewReminders: ChannelPrefs;
      messages: ChannelPrefs;
      marketing: ChannelPrefs;
    }>,
  ) {
    const existing = await this.get(userId);

    await this.db
      .update(notificationPreferencesEnhanced)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(notificationPreferencesEnhanced.id, existing.data.id));

    const updated = await this.get(userId);
    return { data: updated.data, message: 'Notification preferences updated successfully' };
  }

  async toggleWhatsApp(userId: string, enabled: boolean) {
    const existing = await this.get(userId);

    const whatsappUpdate = { whatsapp: enabled };

    await this.db
      .update(notificationPreferencesEnhanced)
      .set({
        jobAlerts: { ...(existing.data.jobAlerts as ChannelPrefs), ...whatsappUpdate },
        applicationUpdates: {
          ...(existing.data.applicationUpdates as ChannelPrefs),
          ...whatsappUpdate,
        },
        interviewReminders: {
          ...(existing.data.interviewReminders as ChannelPrefs),
          ...whatsappUpdate,
        },
        messages: { ...(existing.data.messages as ChannelPrefs), ...whatsappUpdate },
        marketing: { ...(existing.data.marketing as ChannelPrefs), ...whatsappUpdate },
        updatedAt: new Date(),
      })
      .where(eq(notificationPreferencesEnhanced.id, existing.data.id));

    const updated = await this.get(userId);
    return {
      data: updated.data,
      message: `WhatsApp notifications ${enabled ? 'enabled' : 'disabled'} successfully`,
    };
  }
}
