import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { userPreferences } from '@ai-job-portal/database';
import { eq } from 'drizzle-orm';
import { CustomLogger } from '@ai-job-portal/logger';
import { UpdateThemePreferencesDto } from './dto/update-theme-preferences.dto';

@Injectable()
export class UserPreferencesService {
  private readonly logger = new CustomLogger();

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Update or Create User Theme Preferences
   */
  async updateTheme(userId: string, dto: UpdateThemePreferencesDto) {
    const db = this.databaseService.db;

    // 1. Check if preferences exist
    const existingPrefs = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });

    if (existingPrefs) {
      // 2. Update existing
      await db
        .update(userPreferences)
        .set({
          ...dto,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, userId));

      this.logger.info(`Updated theme preferences for user ${userId}`, 'UserPreferencesService');
    } else {
      // 3. Create new with defaults + provided updates
      await db.insert(userPreferences).values({
        userId,
        ...dto,
        // Default flags are handled by DB schema defaults (all true except marketing/sms/whatsapp)
      });

      this.logger.info(`Created default preferences for user ${userId}`, 'UserPreferencesService');
    }

    // 4. Return the updated preferences
    const updatedPrefs = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });

    return {
      status: 'success',
      data: updatedPrefs,
    };
  }

  /**
   * Get User Preferences
   */
  async getPreferences(userId: string) {
    const db = this.databaseService.db;

    let prefs = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });

    // Auto-create defaults if accessing for the first time
    if (!prefs) {
      await db.insert(userPreferences).values({ userId });

      prefs = await db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, userId),
      });

      this.logger.info(
        `Auto-created default preferences for user ${userId}`,
        'UserPreferencesService',
      );
    }

    return prefs;
  }
}
