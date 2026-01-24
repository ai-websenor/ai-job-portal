import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Database, profiles, jobPreferences, userPreferences } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateJobPreferenceDto, UpdateJobPreferenceDto, UserPreferenceDto } from './dto';
import { updateOnboardingStep } from '../utils/onboarding.helper';

@Injectable()
export class PreferenceService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  private async getProfileId(userId: string): Promise<string> {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile.id;
  }

  // Job Preferences
  async getJobPreferences(userId: string) {
    const profileId = await this.getProfileId(userId);

    const prefs = await this.db.query.jobPreferences.findFirst({
      where: eq(jobPreferences.profileId, profileId),
    });

    return prefs || null;
  }

  async createOrUpdateJobPreferences(
    userId: string,
    dto: CreateJobPreferenceDto | UpdateJobPreferenceDto,
  ) {
    const profileId = await this.getProfileId(userId);

    const existing = await this.db.query.jobPreferences.findFirst({
      where: eq(jobPreferences.profileId, profileId),
    });

    const data = {
      ...dto,
      expectedSalary: dto.expectedSalary?.toString(),
      expectedSalaryMin: dto.expectedSalaryMin?.toString(),
      expectedSalaryMax: dto.expectedSalaryMax?.toString(),
      updatedAt: new Date(),
    };

    if (existing) {
      await this.db.update(jobPreferences).set(data).where(eq(jobPreferences.id, existing.id));

      await updateOnboardingStep(this.db, userId, 6);

      return this.getJobPreferences(userId);
    }

    const [prefs] = await this.db
      .insert(jobPreferences)
      .values({
        profileId,
        ...data,
      } as any)
      .returning();

    await updateOnboardingStep(this.db, userId, 6);

    return prefs;
  }

  // User Preferences (app settings)
  async getUserPreferences(userId: string) {
    const prefs = await this.db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });

    return prefs || this.getDefaultUserPreferences();
  }

  private getDefaultUserPreferences() {
    return {
      theme: 'light',
      language: 'en',
      timezone: 'Asia/Kolkata',
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
    };
  }

  async updateUserPreferences(userId: string, dto: UserPreferenceDto) {
    const existing = await this.db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });

    if (existing) {
      await this.db
        .update(userPreferences)
        .set({ ...dto, updatedAt: new Date() })
        .where(eq(userPreferences.id, existing.id));

      return this.getUserPreferences(userId);
    }

    const [prefs] = await this.db
      .insert(userPreferences)
      .values({
        userId,
        ...dto,
      })
      .returning();

    return prefs;
  }
}
