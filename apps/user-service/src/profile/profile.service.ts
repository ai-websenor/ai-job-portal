import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { profiles, users } from '@ai-job-portal/database';
import { eq } from 'drizzle-orm';
import { CustomLogger } from '@ai-job-portal/logger';

@Injectable()
export class ProfileService {
  private readonly logger = new CustomLogger();

  constructor(
    private databaseService: DatabaseService,
    private storageService: StorageService,
  ) {}

  /**
   * Create a new profile for a user
   */
  async create(userId: string, createProfileDto: CreateProfileDto) {
    const db = this.databaseService.db;

    // Check if user exists in the local database (Self-Healing)
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      this.logger.warn(
        `User ${userId} not found in user-service DB. Attempting to self-heal...`,
        'ProfileService',
      );
      if (createProfileDto.email) {
        try {
          await db.insert(users).values({
            id: userId,
            firstName: createProfileDto.firstName || 'Unknown',
            lastName: createProfileDto.lastName || 'User',
            email: createProfileDto.email,
            mobile: createProfileDto.phone || '0000000000',
            password: 'imported_user_placeholder_password', // Placeholder, auth managed by auth-service
            role: 'candidate',
            isActive: true,
            isVerified: false, // Assume verified if they are reaching this stage
          });
          this.logger.info(`Self-healed user ${userId} created successfully.`, 'ProfileService');
        } catch (e: any) {
          this.logger.error(
            `Failed to self-heal user ${userId}: ${e.message}`,
            e,
            'ProfileService',
          );
          // Fall through to let the FK violation happen if insert failed (e.g. email conflict)
        }
      } else {
        this.logger.warn(
          `Cannot self-heal user ${userId}: Email missing in DTO.`,
          'ProfileService',
        );
      }
    }

    // Check if profile already exists
    const existingProfile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });

    if (existingProfile) {
      this.logger.info(
        `Profile already exists for user ${userId}, updating instead`,
        'ProfileService',
      );
      return this.update(userId, createProfileDto);
    }

    const completionPercentage = this.calculateCompletionPercentage({
      ...createProfileDto,
    });

    // Create profile
    const [newProfile] = await db
      .insert(profiles)
      .values({
        userId,
        firstName: createProfileDto.firstName,
        middleName: createProfileDto.middleName,
        lastName: createProfileDto.lastName,
        dateOfBirth: createProfileDto.dateOfBirth
          ? createProfileDto.dateOfBirth.toISOString().split('T')[0]
          : null,
        gender: createProfileDto.gender,
        phone: createProfileDto.phone,
        email: createProfileDto.email,
        alternatePhone: createProfileDto.alternatePhone,
        addressLine1: createProfileDto.addressLine1,
        addressLine2: createProfileDto.addressLine2,
        city: createProfileDto.city,
        state: createProfileDto.state,
        country: createProfileDto.country,
        pinCode: createProfileDto.pinCode,
        professionalSummary: createProfileDto.professionalSummary,
        visibility: createProfileDto.visibility,
        completionPercentage: completionPercentage,
        isProfileComplete: completionPercentage === 100,
      })
      .returning();

    this.logger.success(`Profile created for user ${userId}`, 'ProfileService');
    return newProfile;
  }

  /**
   * Get profile by user ID
   */
  async findByUserId(userId: string) {
    const db = this.databaseService.db;

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return { ...profile, message: 'Profile fetched successfully' };
  }

  /**
   * Find profile by user ID or create a minimal one if it doesn't exist
   * This prevents NotFoundException when accessing candidate features for the first time
   */
  async findOrCreateProfile(userId: string) {
    const db = this.databaseService.db;

    let profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });

    if (!profile) {
      this.logger.warn(
        `Profile not found for user ${userId}, creating minimal profile...`,
        'ProfileService',
      );

      // Fetch user details to populate profile
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Create minimal profile
      [profile] = await db
        .insert(profiles)
        .values({
          userId,
          firstName: user.firstName || 'User',
          lastName: user.lastName || '',
          email: user.email,
          phone: user.mobile || null,
          completionPercentage: 20, // Minimal completion
          isProfileComplete: false,
        })
        .returning();

      this.logger.success(`Minimal profile auto-created for user ${userId}`, 'ProfileService');
    }

    return { ...profile, message: 'Profile fetched successfully' };
  }

  /**
   * Update profile
   */
  async update(userId: string, updateProfileDto: UpdateProfileDto) {
    const db = this.databaseService.db;

    const existingProfile = await this.findByUserId(userId);

    const completionPercentage = this.calculateCompletionPercentage({
      ...existingProfile,
      ...updateProfileDto,
    });

    const updatedData: any = {
      firstName: updateProfileDto.firstName,
      middleName: updateProfileDto.middleName,
      lastName: updateProfileDto.lastName,
      dateOfBirth: updateProfileDto.dateOfBirth
        ? updateProfileDto.dateOfBirth.toISOString().split('T')[0]
        : undefined,
      gender: updateProfileDto.gender,
      phone: updateProfileDto.phone,
      email: updateProfileDto.email,
      alternatePhone: updateProfileDto.alternatePhone,
      addressLine1: updateProfileDto.addressLine1,
      addressLine2: updateProfileDto.addressLine2,
      city: updateProfileDto.city,
      state: updateProfileDto.state,
      country: updateProfileDto.country,
      pinCode: updateProfileDto.pinCode,
      professionalSummary: updateProfileDto.professionalSummary,
      visibility: updateProfileDto.visibility,
      completionPercentage: completionPercentage,
      isProfileComplete: completionPercentage === 100,
      updatedAt: new Date(),
    };

    // Remove undefined values
    Object.keys(updatedData).forEach(
      (key) => updatedData[key] === undefined && delete updatedData[key],
    );

    const [updatedProfile] = await db
      .update(profiles)
      .set(updatedData)
      .where(eq(profiles.userId, userId))
      .returning();

    this.logger.success(`Profile updated for user ${userId}`, 'ProfileService');
    return { updatedProfile, message: 'Profile updated successfully' };
  }

  /**
   * Delete profile
   */
  async delete(userId: string) {
    const db = this.databaseService.db;

    await this.findByUserId(userId); // Check if exists

    await db.delete(profiles).where(eq(profiles.userId, userId));

    this.logger.success(`Profile deleted for user ${userId}`, 'ProfileService');
    return { message: 'Profile deleted successfully' };
  }

  /**
   * Upload profile photo
   */
  async uploadProfilePhoto(userId: string, file: Buffer, contentType: string) {
    const result = await this.storageService.uploadProfilePhoto(userId, file, contentType);

    // Update profile with photo URL in database directly
    const db = this.databaseService.db;
    await db
      .update(profiles)
      .set({
        profilePhoto: result.url,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId));

    return result;
  }

  /**
   * Calculate profile completion percentage
   */
  private calculateCompletionPercentage(profile: any): number {
    const fields = [
      profile.firstName,
      profile.lastName,
      profile.dateOfBirth,
      profile.gender,
      profile.phone,
      profile.city,
      profile.state,
      profile.country,
      profile.professionalSummary,
    ];

    const filledFields = fields.filter(
      (field) => field !== null && field !== undefined && field !== '',
    ).length;
    return Math.round((filledFields / fields.length) * 100);
  }

  /**
   * Get profile completion status
   */
  async getCompletionStatus(userId: string) {
    const profile = await this.findByUserId(userId);

    return {
      completionPercentage: profile.completionPercentage,
      lastUpdated: profile.updatedAt,
      isComplete: profile.isProfileComplete,
      missingFields: this.getMissingFields(profile),
      message: 'Profile status fetched successfully',
    };
  }

  /**
   * Get missing fields for profile completion
   */
  private getMissingFields(profile: any): string[] {
    const requiredFields = {
      firstName: 'First Name',
      lastName: 'Last Name',
      dateOfBirth: 'Date of Birth',
      gender: 'Gender',
      phone: 'Phone Number',
      city: 'City',
      state: 'State',
      country: 'Country',
      professionalSummary: 'Professional Summary',
    };

    const missing: string[] = [];

    for (const [key, label] of Object.entries(requiredFields)) {
      if (!profile[key]) {
        missing.push(label);
      }
    }

    return missing;
  }
  /**
   * Update profile visibility
   */
  async updateVisibility(userId: string, visibility: 'public' | 'private' | 'semi_private') {
    const db = this.databaseService.db;

    // Check if profile exists
    await this.findByUserId(userId);

    await db
      .update(profiles)
      .set({
        visibility,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId));

    this.logger.info(
      `Updated profile visibility to ${visibility} for user ${userId}`,
      'ProfileService',
    );

    return {
      status: 'success',
      message: 'Profile visibility updated successfully',
    };
  }
}
