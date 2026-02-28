/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { Database, employers } from '@ai-job-portal/database';
import { S3Service } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import { UpdateEmployerProfileDto } from './dto';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

@Injectable()
export class EmployerService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly s3Service: S3Service,
  ) {}

  async createProfile(userId: string, dto: any) {
    // Create employer profile (company is created separately by admin)
    const [employer] = await this.db
      .insert(employers)
      .values({
        userId,
        companyId: dto.companyId, // Optional: can be linked later by admin
      })
      .returning();

    return this.getProfile(userId);
  }

  async getProfile(userId: string) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
      with: {
        user: {
          columns: {
            password: false,
          },
        },
        company: true,
        subscriptions: true,
      },
    });
    if (!employer) throw new NotFoundException('Employer profile not found');

    // Convert profile photo to pre-signed download URL
    const profilePhoto = await this.getSignedPhotoUrl(employer.profilePhoto);
    const user = employer.user as any;
    return {
      ...employer,
      profilePhoto,
      country: user?.country || null,
      state: user?.state || null,
      city: user?.city || null,
    };
  }

  /**
   * Converts an S3 key or URL to a pre-signed download URL.
   * Handles both old URLs and new key format for backward compatibility.
   */
  private async getSignedPhotoUrl(photoValue: string | null): Promise<string | null> {
    return this.s3Service.getSignedDownloadUrlFromKeyOrUrl(photoValue);
  }

  async updateProfile(userId: string, dto: UpdateEmployerProfileDto) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new NotFoundException('Employer profile not found');

    // Prevent editing email after registration
    if (dto.email !== undefined && employer.email) {
      throw new BadRequestException('Email is not editable after registration');
    }

    // Prevent editing phone number after registration
    if (dto.phone !== undefined && employer.phone) {
      throw new BadRequestException('Mobile number is not editable after registration');
    }

    // Build update payload dynamically - only include provided fields
    // Map camelCase DTO fields to snake_case database columns
    const updatePayload: any = {
      updatedAt: new Date(),
    };

    if (dto.firstName !== undefined) updatePayload.firstName = dto.firstName;
    if (dto.lastName !== undefined) updatePayload.lastName = dto.lastName;
    if (dto.email !== undefined) updatePayload.email = dto.email;
    if (dto.phone !== undefined) updatePayload.phone = dto.phone;
    if (dto.gender !== undefined) updatePayload.gender = dto.gender;
    if (dto.profilePhoto !== undefined) updatePayload.profilePhoto = dto.profilePhoto;
    if (dto.visibility !== undefined) updatePayload.visibility = dto.visibility;
    if (dto.department !== undefined) updatePayload.department = dto.department;
    if (dto.designation !== undefined) updatePayload.designation = dto.designation;

    await this.db.update(employers).set(updatePayload).where(eq(employers.id, employer.id));

    return this.getProfile(userId);
  }

  async linkEmployerToCompany(userId: string, companyId: string) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new NotFoundException('Employer profile not found');

    await this.db
      .update(employers)
      .set({ companyId, updatedAt: new Date() })
      .where(eq(employers.id, employer.id));

    return this.getProfile(userId);
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

    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new NotFoundException('Employer profile not found');

    // Delete old custom photo if exists (to save S3 storage)
    // We only delete if it was a custom upload (prefix 'profile-photos/')
    if (employer.profilePhoto && employer.profilePhoto.startsWith('profile-photos/')) {
      try {
        await this.s3Service.delete(employer.profilePhoto);
      } catch {
        // Ignore delete errors
      }
    }

    const key = this.s3Service.generateKey('profile-photos', file.originalname);
    await this.s3Service.upload(key, file.buffer, file.mimetype);

    // Store the S3 key, not the full URL
    await this.db
      .update(employers)
      .set({ profilePhoto: key, updatedAt: new Date() })
      .where(eq(employers.id, employer.id));

    const signedUrl = await this.s3Service.getSignedDownloadUrlFromKeyOrUrl(key);
    return {
      message: 'Profile photo updated successfully',
      data: { profilePhoto: signedUrl },
    };
  }

  /**
   * Generate a pre-signed upload URL for profile photo (Step 1 of 2-step upload)
   */
  async generateProfilePhotoUploadUrl(userId: string, fileName: string, contentType: string) {
    const ALLOWED_IMAGE_TYPES_LIST = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED_IMAGE_TYPES_LIST.includes(contentType)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, WebP allowed');
    }

    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new NotFoundException('Employer profile not found');

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

    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new NotFoundException('Employer profile not found');

    // Verify file was actually uploaded to S3
    const exists = await this.s3Service.exists(key);
    if (!exists) {
      throw new BadRequestException(
        'Photo not found in storage. Please upload the file first using the pre-signed URL.',
      );
    }

    // Delete old photo if exists (only custom uploads, not avatars)
    if (employer.profilePhoto && employer.profilePhoto.startsWith('profile-photos/')) {
      try {
        if (employer.profilePhoto !== key) {
          await this.s3Service.delete(employer.profilePhoto);
        }
      } catch {
        // Ignore delete errors
      }
    }

    // Store the S3 key
    await this.db
      .update(employers)
      .set({ profilePhoto: key, updatedAt: new Date() })
      .where(eq(employers.id, employer.id));

    const signedUrl = await this.s3Service.getSignedDownloadUrlFromKeyOrUrl(key);
    return { message: 'Profile photo updated successfully', data: { profilePhoto: signedUrl } };
  }

  /**
   * List all active avatars available for selection
   */
  async listAvatars(query?: { gender?: string; search?: string }) {
    const { profileAvatars } = await import('@ai-job-portal/database');
    const { desc, ilike } = await import('drizzle-orm');

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
   * Select an avatar for the employer profile
   */
  async selectAvatar(userId: string, avatarId: string) {
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
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });

    if (!employer) {
      throw new NotFoundException('Employer profile not found');
    }

    // 3. Delete old custom photo if exists (to save S3 storage)
    if (employer.profilePhoto && employer.profilePhoto.startsWith('profile-photos/')) {
      try {
        await this.s3Service.delete(employer.profilePhoto);
      } catch {
        // Ignore delete errors
      }
    }

    // 4. Update profile with avatar key
    await this.db
      .update(employers)
      .set({
        profilePhoto: avatar.imageUrl,
        updatedAt: new Date(),
      })
      .where(eq(employers.id, employer.id));

    const signedUrl = await this.s3Service.getSignedDownloadUrlFromKeyOrUrl(avatar.imageUrl);
    return {
      message: 'Avatar selected successfully',
      data: { profilePhoto: signedUrl },
    };
  }
}
