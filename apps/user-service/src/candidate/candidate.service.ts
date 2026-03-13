import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  Database,
  profiles,
  workExperiences,
  educationRecords,
  profileViews,
  users,
} from '@ai-job-portal/database';
import { S3Service } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import { EducationService } from '../education/education.service';
import {
  CreateCandidateProfileDto,
  UpdateCandidateProfileDto,
  AddExperienceDto,
  AddEducationDto,
  UpdateExperienceDto,
  UpdateEducationDto,
  ProfileViewQueryDto,
} from './dto';
import {
  updateOnboardingStep,
  recalculateOnboardingCompletion,
  updateTotalExperience,
  calculateProfileCompletionDetail,
} from '../utils/onboarding.helper';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const DATE_FORMAT_HINT = 'Expected format: YYYY-MM-DD (e.g., 2024-01-15)';

function isValidCalendarDate(dateStr: string): boolean {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  // Verify the date components match (catches invalid dates like 2024-02-30)
  const [year, month, day] = dateStr.split('-').map(Number);
  return d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month && d.getUTCDate() === day;
}

@Injectable()
export class CandidateService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly s3Service: S3Service,
    private readonly educationService: EducationService,
  ) {}

  private validateExperienceDates(startDate?: string, endDate?: string, isCurrent?: boolean) {
    if (startDate) {
      if (!isValidCalendarDate(startDate)) {
        throw new BadRequestException(
          `Invalid startDate: "${startDate}" is not a valid calendar date. ${DATE_FORMAT_HINT}`,
        );
      }
      if (new Date(startDate) > new Date()) {
        throw new BadRequestException('startDate cannot be in the future');
      }
    }

    if (endDate) {
      if (!isValidCalendarDate(endDate)) {
        throw new BadRequestException(
          `Invalid endDate: "${endDate}" is not a valid calendar date. ${DATE_FORMAT_HINT}`,
        );
      }
    }

    if (startDate && endDate) {
      if (new Date(endDate) <= new Date(startDate)) {
        throw new BadRequestException('endDate must be after startDate');
      }
    }

    if (startDate && !isCurrent && !endDate) {
      throw new BadRequestException('endDate is required when isCurrent is false');
    }
  }

  private validateEducationDates(
    startDate?: string,
    endDate?: string,
    currentlyStudying?: boolean,
  ) {
    if (startDate) {
      if (!isValidCalendarDate(startDate)) {
        throw new BadRequestException(
          `Invalid startDate: "${startDate}" is not a valid calendar date. ${DATE_FORMAT_HINT}`,
        );
      }
      if (new Date(startDate) > new Date()) {
        throw new BadRequestException('startDate cannot be in the future');
      }
    }

    if (endDate) {
      if (!isValidCalendarDate(endDate)) {
        throw new BadRequestException(
          `Invalid endDate: "${endDate}" is not a valid calendar date. ${DATE_FORMAT_HINT}`,
        );
      }
    }

    if (startDate && endDate) {
      if (new Date(endDate) <= new Date(startDate)) {
        throw new BadRequestException('endDate must be after startDate');
      }
    }

    if (startDate && !currentlyStudying && !endDate) {
      throw new BadRequestException('endDate is required when currentlyStudying is false');
    }
  }

  private async checkEducationOverlap(
    profileId: string,
    startDate: string,
    endDate: string | null | undefined,
    currentlyStudying: boolean,
    excludeId?: string,
  ) {
    const existingRecords = await this.db.query.educationRecords.findMany({
      where: eq(educationRecords.profileId, profileId),
    });

    const today = new Date().toISOString().split('T')[0];

    const newStart = new Date(startDate);
    const newEnd = new Date(currentlyStudying || !endDate ? today : endDate);

    for (const existing of existingRecords) {
      if (excludeId && existing.id === excludeId) continue;
      if (!existing.startDate) continue;

      const existStart = new Date(existing.startDate);
      const existEnd = new Date(
        existing.currentlyStudying || !existing.endDate ? today : existing.endDate,
      );

      // Two ranges overlap when: start1 < end2 AND start2 < end1
      if (newStart < existEnd && existStart < newEnd) {
        const conflictLabel = `${existing.degree} at ${existing.institution}`;
        throw new BadRequestException(
          `Education dates overlap with existing record: "${conflictLabel}" ` +
            `(${existing.startDate} to ${existing.endDate || 'present'}). ` +
            `Please adjust your dates to avoid overlapping education periods.`,
        );
      }
    }
  }

  private async getProfileId(userId: string): Promise<string> {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile.id;
  }

  async updateProfilePhoto(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, WebP allowed');
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException('File too large. Max 2MB allowed');
    }

    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    // Delete old photo if exists
    if (profile.profilePhoto) {
      try {
        const oldKey = this.s3Service.extractKeyFromUrl(profile.profilePhoto);
        await this.s3Service.delete(oldKey);
      } catch {
        // Ignore delete errors
      }
    }

    const key = this.s3Service.generateKey('profile-photos', file.originalname);
    await this.s3Service.upload(key, file.buffer, file.mimetype);

    // Store the S3 key, not the full URL
    await this.db
      .update(profiles)
      .set({ profilePhoto: key, updatedAt: new Date() })
      .where(eq(profiles.id, profile.id));

    const signedUrl = await this.s3Service.getSignedDownloadUrlFromKeyOrUrl(key);
    return { message: 'Profile photo updated successfully', data: { profilePhoto: signedUrl } };
  }

  /**
   * Generate a pre-signed upload URL for profile photo (Step 1 of 2-step upload)
   */
  async generateProfilePhotoUploadUrl(userId: string, fileName: string, contentType: string) {
    if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, WebP allowed');
    }

    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    const key = this.s3Service.generateKey('profile-photos', fileName);
    const expiresIn = 3600;
    const uploadUrl = await this.s3Service.getSignedUploadUrl(key, contentType, expiresIn);

    return { uploadUrl, key, expiresIn };
  }

  /**
   * Confirm profile photo upload after client uploads to S3 (Step 2 of 2-step upload)
   */
  async confirmProfilePhotoUpload(userId: string, key: string) {
    if (!key.startsWith('profile-photos/')) {
      throw new BadRequestException('Invalid photo key');
    }

    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    // Verify file was actually uploaded to S3
    const exists = await this.s3Service.exists(key);
    if (!exists) {
      throw new BadRequestException(
        'Photo not found in storage. Please upload the file first using the pre-signed URL.',
      );
    }

    // Delete old photo if exists (only custom uploads, not avatars)
    if (profile.profilePhoto && profile.profilePhoto.startsWith('profile-photos/')) {
      try {
        if (profile.profilePhoto !== key) {
          await this.s3Service.delete(profile.profilePhoto);
        }
      } catch {
        // Ignore delete errors
      }
    }

    // Store the S3 key
    await this.db
      .update(profiles)
      .set({ profilePhoto: key, updatedAt: new Date() })
      .where(eq(profiles.id, profile.id));

    const signedUrl = await this.s3Service.getSignedDownloadUrlFromKeyOrUrl(key);
    return { message: 'Profile photo updated successfully', data: { profilePhoto: signedUrl } };
  }
  /**
   * List all active avatars available for selection
   */
  async listAvatars(query?: { gender?: string; search?: string }) {
    // Import profileAvatars from database
    const { profileAvatars } = await import('@ai-job-portal/database');
    const { ilike } = await import('drizzle-orm');

    // Build conditions - always filter active only
    const conditions = [eq(profileAvatars.isActive, true)];

    if (query?.gender) {
      conditions.push(eq(profileAvatars.gender, query.gender));
    }

    if (query?.search) {
      conditions.push(ilike(profileAvatars.name, `%${query.search}%`));
    }

    // Get avatars with filters, ordered by display order
    const avatars = await this.db.query.profileAvatars.findMany({
      where: and(...conditions),
      orderBy: [desc(profileAvatars.displayOrder), desc(profileAvatars.createdAt)],
    });

    // Convert S3 keys to public URLs
    return {
      message: 'Available avatars retrieved successfully',
      data: avatars.map((avatar) => ({
        ...avatar,
        imageUrl: this.s3Service.getPublicUrl(avatar.imageUrl),
      })),
    };
  }

  /**
   * Select an avatar from the available avatars
   */
  async selectAvatar(userId: string, avatarId: string) {
    // Import profileAvatars from database
    const { profileAvatars } = await import('@ai-job-portal/database');
    const { and } = await import('drizzle-orm');

    // 1. Verify avatar exists and is active
    const avatar = await this.db.query.profileAvatars.findFirst({
      where: and(eq(profileAvatars.id, avatarId), eq(profileAvatars.isActive, true)),
    });

    if (!avatar) {
      throw new NotFoundException('Avatar not found or inactive');
    }

    // 2. Get user profile
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // 3. Delete old custom photo if exists (only if it's a custom upload, not an avatar)
    // We can differentiate by checking if the key starts with 'profile-photos/' vs 'avatars/'
    if (profile.profilePhoto && profile.profilePhoto.startsWith('profile-photos/')) {
      try {
        await this.s3Service.delete(profile.profilePhoto);
      } catch {
        // Ignore delete errors
      }
    }

    // 4. Update profile with avatar URL (store the S3 key, not full URL)
    await this.db
      .update(profiles)
      .set({
        profilePhoto: avatar.imageUrl,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, profile.id));

    // Return with pre-signed URL
    const signedUrl = await this.s3Service.getSignedDownloadUrlFromKeyOrUrl(avatar.imageUrl);
    return {
      message: 'Avatar selected successfully',
      data: { profilePhoto: signedUrl },
    };
  }

  /**
   * Converts an S3 key or URL to a pre-signed download URL.
   * Handles both old URLs and new key format for backward compatibility.
   */
  private async getSignedPhotoUrl(photoValue: string | null): Promise<string | null> {
    return this.s3Service.getSignedDownloadUrlFromKeyOrUrl(photoValue);
  }

  async createProfile(userId: string, dto: CreateCandidateProfileDto) {
    const [profile] = await this.db
      .insert(profiles)
      .values({
        userId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        headline: dto.headline,
        professionalSummary: dto.summary,
        city: dto.locationCity,
        state: dto.locationState,
        country: dto.locationCountry,
      })
      .returning();

    await updateOnboardingStep(this.db, userId, 2);

    return { message: 'Profile created successfully', data: profile };
  }

  async getProfile(userId: string) {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
      with: {
        workExperiences: true,
        educationRecords: true,
        certifications: true,
        profileSkills: true,
        resumes: true,
        jobPreferences: true,
      },
    });
    if (!profile) throw new NotFoundException('Profile not found');

    // Fetch countryCode and nationalNumber from users table
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        countryCode: true,
        nationalNumber: true,
      },
    });

    // Convert profile photo to pre-signed download URL
    const profilePhoto = await this.getSignedPhotoUrl(profile.profilePhoto);

    // Convert video resume URL to permanent public URL
    const videoUrl = this.s3Service.getPublicUrlFromKeyOrUrl(profile.videoResumeUrl);

    // Strip parsedContent from resumes (internal field, not needed by frontend)
    const resumes =
      profile.resumes?.map(({ parsedContent: _parsedContent, ...rest }) => rest) || [];

    // Format totalExperienceYears: 0 → "0", 4.00 → "4", 4.50 → "4+"
    const rawYears = profile.totalExperienceYears ? parseFloat(profile.totalExperienceYears) : 0;
    const floored = Math.floor(rawYears);
    const totalExperienceYears =
      rawYears === 0 ? '0' : rawYears > floored ? `${floored}+` : `${floored}`;

    // Calculate remaining sections count for "X details remaining" display
    const completionDetail = await calculateProfileCompletionDetail(this.db, userId);

    return {
      ...profile,
      profilePhoto,
      videoResumeUrl: videoUrl,
      videoUrl,
      videoStatus: profile.videoProfileStatus || null,
      rejectionReason: profile.videoRejectionReason || null,
      resumes,
      totalExperienceYears,
      countryCode: user?.countryCode || null,
      nationalNumber: user?.nationalNumber || null,
      remainingCount: completionDetail.remainingCount,
    };
  }

  async getProfileCompletion(userId: string) {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    return calculateProfileCompletionDetail(this.db, userId);
  }

  async updateProfile(userId: string, dto: UpdateCandidateProfileDto) {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    // Prevent editing phone number after registration
    if (dto.phone !== undefined && profile.phone) {
      throw new BadRequestException('Mobile number is not editable after registration');
    }

    // Map DTO fields to database columns
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Map location fields from DTO naming to database column naming
    if (dto.locationCity !== undefined) updateData.city = dto.locationCity;
    if (dto.locationState !== undefined) updateData.state = dto.locationState;
    if (dto.locationCountry !== undefined) updateData.country = dto.locationCountry;

    // Map other fields directly
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.headline !== undefined) updateData.headline = dto.headline;
    if (dto.summary !== undefined) updateData.professionalSummary = dto.summary;

    await this.db.update(profiles).set(updateData).where(eq(profiles.id, profile.id));

    await updateOnboardingStep(this.db, userId, 2);

    return this.getProfile(userId);
  }

  // Work Experience CRUD
  async addExperience(userId: string, dto: AddExperienceDto) {
    this.validateExperienceDates(dto.startDate, dto.endDate, dto.isCurrent);
    const profileId = await this.getProfileId(userId);

    const [experience] = await this.db
      .insert(workExperiences)
      .values({
        profileId,
        companyName: dto.companyName,
        jobTitle: dto.title,
        designation: dto.designation,
        employmentType: dto.employmentType as any,
        location: dto.location,
        startDate: dto.startDate,
        endDate: dto.endDate || null,
        duration: dto.duration,
        isCurrent: dto.isCurrent || false,
        isFresher: dto.isFresher || false,
        description: dto.description,
        achievements: dto.achievements,
        skillsUsed: dto.skillsUsed,
        displayOrder: dto.displayOrder || 0,
      })
      .returning();

    await updateOnboardingStep(this.db, userId, 5);
    await updateTotalExperience(this.db, userId);

    return { message: 'Experience added successfully', data: experience };
  }

  async getExperiences(userId: string) {
    const profileId = await this.getProfileId(userId);

    return this.db.query.workExperiences.findMany({
      where: eq(workExperiences.profileId, profileId),
      orderBy: (e, { asc }) => [asc(e.displayOrder), desc(e.startDate)],
    });
  }

  async getExperience(userId: string, id: string) {
    const profileId = await this.getProfileId(userId);

    const exp = await this.db.query.workExperiences.findFirst({
      where: and(eq(workExperiences.id, id), eq(workExperiences.profileId, profileId)),
    });

    if (!exp) throw new NotFoundException('Experience not found');
    return exp;
  }

  async updateExperience(userId: string, id: string, dto: UpdateExperienceDto) {
    const profileId = await this.getProfileId(userId);

    const existing = await this.db.query.workExperiences.findFirst({
      where: and(eq(workExperiences.id, id), eq(workExperiences.profileId, profileId)),
    });

    if (!existing) throw new NotFoundException('Experience not found');

    // Merge with existing values for cross-field validation
    const effectiveStart = dto.startDate ?? existing.startDate ?? undefined;
    const effectiveEnd = dto.endDate ?? existing.endDate ?? undefined;
    const effectiveIsCurrent = dto.isCurrent ?? existing.isCurrent ?? undefined;
    this.validateExperienceDates(effectiveStart, effectiveEnd, effectiveIsCurrent);

    const updateData: Record<string, any> = { ...dto, updatedAt: new Date() };
    if (dto.title) {
      updateData.jobTitle = dto.title;
    }

    await this.db.update(workExperiences).set(updateData).where(eq(workExperiences.id, id));

    await updateOnboardingStep(this.db, userId, 5);
    await updateTotalExperience(this.db, userId);

    return this.getExperience(userId, id);
  }

  async removeExperience(userId: string, id: string) {
    const profileId = await this.getProfileId(userId);

    const existing = await this.db.query.workExperiences.findFirst({
      where: and(eq(workExperiences.id, id), eq(workExperiences.profileId, profileId)),
    });

    if (!existing) throw new NotFoundException('Experience not found');

    await this.db.delete(workExperiences).where(eq(workExperiences.id, id));

    await recalculateOnboardingCompletion(this.db, userId);
    await updateTotalExperience(this.db, userId);

    return { success: true };
  }

  // Education CRUD
  async addEducation(userId: string, dto: AddEducationDto) {
    this.validateEducationDates(dto.startDate, dto.endDate, dto.currentlyStudying);

    const profileId = await this.getProfileId(userId);

    await this.checkEducationOverlap(
      profileId,
      dto.startDate,
      dto.endDate,
      dto.currentlyStudying || false,
    );

    // Auto-create degree in master table if it doesn't exist (as user-typed)
    if (dto.degree) {
      await this.educationService.findOrCreateDegree(dto.degree, dto.level);
    }

    // Auto-create field of study in master table if it doesn't exist (as user-typed)
    // Note: This requires finding the degree first to link the field to it
    if (dto.degree && dto.fieldOfStudy) {
      const degree = await this.educationService.findOrCreateDegree(dto.degree, dto.level);
      await this.educationService.findOrCreateFieldOfStudy(dto.fieldOfStudy, degree.id);
    }

    const [education] = await this.db
      .insert(educationRecords)
      .values({
        profileId,
        level: dto.level as any,
        institution: dto.institution,
        degree: dto.degree,
        fieldOfStudy: dto.fieldOfStudy,
        startDate: dto.startDate,
        endDate: dto.endDate || null,
        grade: dto.grade,
        description: dto.description,
        honors: dto.honors,
        relevantCoursework: dto.relevantCoursework,
        currentlyStudying: dto.currentlyStudying || false,
        displayOrder: dto.displayOrder || 0,
      })
      .returning();

    await updateOnboardingStep(this.db, userId, 3);

    return education;
  }

  async getEducations(userId: string) {
    const profileId = await this.getProfileId(userId);

    return this.db.query.educationRecords.findMany({
      where: eq(educationRecords.profileId, profileId),
      orderBy: (e, { asc, desc }) => [asc(e.displayOrder), desc(e.endDate)],
    });
  }

  async getEducation(userId: string, id: string) {
    const profileId = await this.getProfileId(userId);

    const edu = await this.db.query.educationRecords.findFirst({
      where: and(eq(educationRecords.id, id), eq(educationRecords.profileId, profileId)),
    });

    if (!edu) throw new NotFoundException('Education not found');
    return edu;
  }

  async updateEducation(userId: string, id: string, dto: UpdateEducationDto) {
    const profileId = await this.getProfileId(userId);

    const existing = await this.db.query.educationRecords.findFirst({
      where: and(eq(educationRecords.id, id), eq(educationRecords.profileId, profileId)),
    });

    if (!existing) throw new NotFoundException('Education not found');

    // Merge with existing values for cross-field validation
    const effectiveStart = dto.startDate ?? existing.startDate ?? undefined;
    const effectiveEnd = dto.endDate ?? existing.endDate ?? undefined;
    const effectiveCurrentlyStudying =
      dto.currentlyStudying ?? existing.currentlyStudying ?? undefined;
    this.validateEducationDates(effectiveStart, effectiveEnd, effectiveCurrentlyStudying);

    // Check for timeline overlap (exclude current record from comparison)
    if (effectiveStart) {
      await this.checkEducationOverlap(
        profileId,
        effectiveStart,
        effectiveEnd,
        effectiveCurrentlyStudying || false,
        id,
      );
    }

    const updateData: Record<string, any> = { ...dto, updatedAt: new Date() };

    await this.db.update(educationRecords).set(updateData).where(eq(educationRecords.id, id));

    await updateOnboardingStep(this.db, userId, 3);

    return this.getEducation(userId, id);
  }

  async removeEducation(userId: string, id: string) {
    const profileId = await this.getProfileId(userId);

    const existing = await this.db.query.educationRecords.findFirst({
      where: and(eq(educationRecords.id, id), eq(educationRecords.profileId, profileId)),
    });

    if (!existing) throw new NotFoundException('Education not found');

    await this.db.delete(educationRecords).where(eq(educationRecords.id, id));

    await recalculateOnboardingCompletion(this.db, userId);

    return { success: true };
  }

  async updateVisibility(userId: string, visibility: 'public' | 'private') {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    await this.db
      .update(profiles)
      .set({ visibility, updatedAt: new Date() })
      .where(eq(profiles.id, profile.id));

    return { message: 'Profile visibility updated successfully', data: { visibility } };
  }

  // Profile Views
  async getProfileViews(userId: string, query: ProfileViewQueryDto) {
    const profileId = await this.getProfileId(userId);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const views = await this.db.query.profileViews.findMany({
      where: eq(profileViews.profileId, profileId),
      orderBy: (v, { desc }) => [desc(v.viewedAt)],
      limit,
      offset,
    });

    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(profileViews)
      .where(eq(profileViews.profileId, profileId));

    return {
      data: views,
      meta: {
        total: Number(totalResult[0]?.count || 0),
        page,
        limit,
        totalPages: Math.ceil(Number(totalResult[0]?.count || 0) / limit),
      },
    };
  }
}
