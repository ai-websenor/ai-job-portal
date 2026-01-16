import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Database, notificationPreferences } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';

@Injectable()
export class PreferenceService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async get(userId: string) {
    let prefs = await this.db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, userId),
    });

    if (!prefs) {
      // Create default preferences
      const [created] = await this.db.insert(notificationPreferences).values({
        userId,
      }).returning();
      prefs = created;
    }

    return prefs;
  }

  async update(userId: string, dto: Partial<{
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    applicationUpdates: boolean;
    interviewReminders: boolean;
    jobAlerts: boolean;
    promotionalEmails: boolean;
  }>) {
    const existing = await this.get(userId);

    await this.db.update(notificationPreferences)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(notificationPreferences.id, existing.id));

    return this.get(userId);
  }
}
