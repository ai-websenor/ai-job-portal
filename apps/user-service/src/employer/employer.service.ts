/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Database, employers, companies } from '@ai-job-portal/database';
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
    // First create the company if company details provided
    let companyId: string | undefined;
    if (dto.companyName) {
      const slug = dto.companyName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      const [company] = await this.db
        .insert(companies)
        .values({
          userId,
          name: dto.companyName,
          slug: `${slug}-${Date.now()}`,
          logoUrl: dto.companyLogo,
          website: dto.website,
          industry: dto.industry,
          companySize: dto.companySize,
          description: dto.description,
        })
        .returning();
      companyId = company.id;
    }

    // Create employer profile linked to company
    const [employer] = await this.db
      .insert(employers)
      .values({
        userId,
        companyId,
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
    return employer;
  }

  async updateProfile(userId: string, dto: UpdateEmployerProfileDto) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new NotFoundException('Employer profile not found');

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

  async createCompany(userId: string, dto: any) {
    const slug = dto.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    const [company] = await this.db
      .insert(companies)
      .values({
        userId,
        name: dto.name,
        slug: `${slug}-${Date.now()}`,
        industry: dto.industry,
        companySize: dto.companySize,
        website: dto.website,
        description: dto.description,
        headquarters: dto.headquarters,
      })
      .returning();

    return company;
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
        const url = new URL(employer.profilePhoto);
        const key = url.pathname.slice(1);
        await this.s3Service.delete(key);
      } catch {
        // Ignore delete errors
      }
    }

    const key = this.s3Service.generateKey('profile-photos', file.originalname);
    const uploadResult = await this.s3Service.upload(key, file.buffer, file.mimetype);

    await this.db
      .update(employers)
      .set({ profilePhoto: uploadResult.url, updatedAt: new Date() })
      .where(eq(employers.id, employer.id));

    return { profilePhoto: uploadResult.url };
  }
}
