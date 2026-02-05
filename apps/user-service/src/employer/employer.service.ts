/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
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
        company: true,
        subscriptions: true,
      },
    });
    if (!employer) throw new NotFoundException('Employer profile not found');

    // Convert profile photo to permanent public URL
    const profilePhoto = this.getPublicPhotoUrl(employer.profilePhoto);
    return { ...employer, profilePhoto };
  }

  /**
   * Converts an S3 key or URL to a permanent public URL.
   * Handles both old URLs and new key format for backward compatibility.
   */
  private getPublicPhotoUrl(photoValue: string | null): string | null {
    return this.s3Service.getPublicUrlFromKeyOrUrl(photoValue);
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

    // Delete old photo if exists
    if (employer.profilePhoto) {
      try {
        let oldKey = employer.profilePhoto;
        // If it's a URL (old format), extract the key
        if (oldKey.startsWith('http')) {
          const url = new URL(oldKey);
          oldKey = url.pathname.slice(1);
        }
        await this.s3Service.delete(oldKey);
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

    // Return a permanent public URL
    const publicUrl = this.s3Service.getPublicUrl(key);
    return { profilePhoto: publicUrl };
  }
}
