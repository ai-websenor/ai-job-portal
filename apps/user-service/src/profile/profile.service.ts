import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { profiles } from '@ai-job-portal/database';
import { eq } from 'drizzle-orm';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private databaseService: DatabaseService,
    private storageService: StorageService,
  ) { }

  /**
   * Create a new profile for a user
   */
  async create(userId: string, createProfileDto: CreateProfileDto) {
    const db = this.databaseService.db;

    // Check if profile already exists
    const existingProfile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });

    if (existingProfile) {
      throw new ConflictException('Profile already exists for this user');
    }

    const completionPercentage = this.calculateCompletionPercentage({
      ...createProfileDto
    });

    // Create profile
    const [newProfile] = await db
      .insert(profiles)
      .values({
        userId,
        firstName: createProfileDto.firstName,
        middleName: createProfileDto.middleName,
        lastName: createProfileDto.lastName,
        dateOfBirth: createProfileDto.dateOfBirth ? createProfileDto.dateOfBirth.toISOString().split('T')[0] : null,
        gender: createProfileDto.gender,
        phone: createProfileDto.phone,
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

    this.logger.log(`Profile created for user ${userId}`);
    return newProfile;
  }

  /**
   * Get profile by user ID
   */
  async findByUserId(userId: string) {
    console.log("findByUserId>>>>>>>>>>>>>>>>>>>>>", userId);
    const db = this.databaseService.db;

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
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
      dateOfBirth: updateProfileDto.dateOfBirth ? updateProfileDto.dateOfBirth.toISOString().split('T')[0] : undefined,
      gender: updateProfileDto.gender,
      phone: updateProfileDto.phone,
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
    Object.keys(updatedData).forEach(key => updatedData[key] === undefined && delete updatedData[key]);

    const [updatedProfile] = await db
      .update(profiles)
      .set(updatedData)
      .where(eq(profiles.userId, userId))
      .returning();

    this.logger.log(`Profile updated for user ${userId}`);
    return updatedProfile;
  }

  /**
   * Delete profile
   */
  async delete(userId: string) {
    const db = this.databaseService.db;

    await this.findByUserId(userId); // Check if exists

    await db.delete(profiles).where(eq(profiles.userId, userId));

    this.logger.log(`Profile deleted for user ${userId}`);
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

    const filledFields = fields.filter(field => field !== null && field !== undefined && field !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  }

  /**
   * Get profile completion status
   */
  async getCompletionStatus(userId: string) {
    const profile = await this.findByUserId(userId);

    return {
      completionPercentage: profile.completionPercentage,
      isComplete: profile.isProfileComplete,
      missingFields: this.getMissingFields(profile),
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
}
