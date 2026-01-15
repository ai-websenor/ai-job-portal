import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UpdateJobPreferencesDto } from './dto/update-job-preferences.dto';
import { jobPreferences } from '@ai-job-portal/database';
import { eq } from 'drizzle-orm';
import { CustomLogger } from '@ai-job-portal/logger';

@Injectable()
export class PreferencesService {
  private readonly logger = new CustomLogger();

  constructor(private databaseService: DatabaseService) {}

  /**
   * Get job preferences for a profile
   */
  async findByProfile(profileId: string) {
    const db = this.databaseService.db;

    const preferences = await db.query.jobPreferences.findFirst({
      where: eq(jobPreferences.profileId, profileId),
    });

    if (!preferences) {
      // Create default preferences if none exist
      return this.createDefault(profileId);
    }

    // Parse JSON fields
    return {
      ...preferences,
      jobTypes: preferences.jobTypes ? JSON.parse(preferences.jobTypes) : [],
      preferredLocations: preferences.preferredLocations
        ? JSON.parse(preferences.preferredLocations)
        : [],
      preferredIndustries: preferences.preferredIndustries
        ? JSON.parse(preferences.preferredIndustries)
        : [],
      message: 'Preferences fetched successfuly',
    };
  }

  /**
   * Create default preferences
   */
  private async createDefault(profileId: string) {
    const db = this.databaseService.db;

    const [preferences] = await db
      .insert(jobPreferences)
      .values({
        profileId,
        jobTypes: JSON.stringify([]),
        preferredLocations: JSON.stringify([]),
        preferredIndustries: JSON.stringify([]),
        willingToRelocate: false,
        salaryCurrency: 'INR',
        noticePeriodDays: 30,
        jobSearchStatus: 'actively_looking',
      })
      .returning();

    this.logger.success(
      `Default job preferences created for profile ${profileId}`,
      'PreferencesService',
    );

    return {
      ...preferences,
      jobTypes: [],
      preferredLocations: [],
      preferredIndustries: [],
    };
  }

  /**
   * Update job preferences
   */
  async update(profileId: string, updateDto: UpdateJobPreferencesDto) {
    const db = this.databaseService.db;

    // Ensure preferences exist
    await this.findByProfile(profileId);

    const updateData: any = {
      jobTypes: updateDto.jobTypes !== undefined ? JSON.stringify(updateDto.jobTypes) : undefined,
      preferredLocations:
        updateDto.preferredLocations !== undefined
          ? JSON.stringify(updateDto.preferredLocations)
          : undefined,
      willingToRelocate: updateDto.willingToRelocate,
      expectedSalaryMin: updateDto.expectedSalaryMin?.toString(),
      expectedSalaryMax: updateDto.expectedSalaryMax?.toString(),
      salaryCurrency: updateDto.salaryCurrency,
      expectedSalary: updateDto.expectedSalary?.toString(),
      noticePeriod: updateDto.noticePeriod,
      noticePeriodDays: updateDto.noticePeriodDays,
      preferredIndustries:
        updateDto.preferredIndustries !== undefined
          ? JSON.stringify(updateDto.preferredIndustries)
          : undefined,
      workShift: updateDto.workShift,
      jobSearchStatus: updateDto.jobSearchStatus,
      updatedAt: new Date(),
    };

    // Remove undefined values
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key],
    );

    const [updated] = await db
      .update(jobPreferences)
      .set(updateData)
      .where(eq(jobPreferences.profileId, profileId))
      .returning();

    this.logger.success(`Job preferences updated for profile ${profileId}`, 'PreferencesService');

    // Parse JSON fields for response
    return {
      ...updated,
      jobTypes: updated.jobTypes ? JSON.parse(updated.jobTypes) : [],
      preferredLocations: updated.preferredLocations ? JSON.parse(updated.preferredLocations) : [],
      preferredIndustries: updated.preferredIndustries
        ? JSON.parse(updated.preferredIndustries)
        : [],
    };
  }

  /**
   * Delete job preferences
   */
  async delete(profileId: string) {
    const db = this.databaseService.db;

    await db.delete(jobPreferences).where(eq(jobPreferences.profileId, profileId));

    this.logger.success(`Job preferences deleted for profile ${profileId}`, 'PreferencesService');
    return { message: 'Job preferences deleted successfully' };
  }
}
