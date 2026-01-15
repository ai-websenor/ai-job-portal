import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { profiles } from '@ai-job-portal/database';
import { eq } from 'drizzle-orm';
import { CustomLogger } from '@ai-job-portal/logger';

@Injectable()
export class EmployerService {
  private readonly logger = new CustomLogger();

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Update employer profile visibility
   */
  async updateVisibility(userId: string, visibility: 'public' | 'private') {
    const db = this.databaseService.db;

    // 1. Check if profile exists
    const existingProfile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });

    if (existingProfile) {
      // Update existing profile
      await db
        .update(profiles)
        .set({
          visibility,
          updatedAt: new Date(),
        })
        .where(eq(profiles.userId, userId));

      this.logger.info(
        `Updated profile visibility to ${visibility} for employer ${userId}`,
        'EmployerService',
      );
    } else {
      // Create new profile if not exists (Upsert-like behavior)
      await db.insert(profiles).values({
        userId,
        visibility,
        isProfileComplete: false,
        completionPercentage: 0,
      });

      this.logger.info(
        `Created new profile with visibility ${visibility} for employer ${userId}`,
        'EmployerService',
      );
    }

    return {
      status: 'success',
      message: 'Profile visibility updated successfully',
    };
  }
}
