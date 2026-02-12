import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { Database, profileAvatars } from '@ai-job-portal/database';
import { S3Service } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateAvatarDto, UpdateAvatarDto, AvatarQueryDto } from './dto';
import type { MultipartFile } from '@fastify/multipart';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

@Injectable()
export class AvatarService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Create avatar from multipart file upload
   * Handles file extraction, validation, and creation
   */
  async createFromUpload(data: MultipartFile) {
    // Extract name from form fields
    const fields = data.fields as any;
    const name = fields.name?.value;
    if (!name) {
      throw new BadRequestException('Avatar name is required');
    }

    // Convert file to buffer
    const buffer = await data.toBuffer();

    // Validate and create
    return this.create(
      { name },
      {
        buffer,
        originalname: data.filename,
        mimetype: data.mimetype,
        size: buffer.length,
      },
    );
  }

  /**
   * Upload a new avatar image (internal method)
   */
  async create(
    dto: CreateAvatarDto,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    // Validate file
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, WebP allowed');
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException('File too large. Max 2MB allowed');
    }

    // Upload to S3
    const key = this.s3Service.generateKey('avatars', file.originalname);
    const _uploadResult = await this.s3Service.upload(key, file.buffer, file.mimetype);

    // Create database record
    const [avatar] = await this.db
      .insert(profileAvatars)
      .values({
        name: dto.name,
        imageUrl: key, // Store S3 key, not full URL
        isActive: true,
        displayOrder: 0,
      })
      .returning();

    // Return with public URL and success message
    return {
      message: 'Avatar uploaded successfully',
      data: {
        ...avatar,
        imageUrl: this.s3Service.getPublicUrl(avatar.imageUrl),
      },
    };
  }

  /**
   * List all avatars with optional filtering
   */
  async findAll(query: AvatarQueryDto) {
    const conditions = [];

    if (query.activeOnly) {
      conditions.push(eq(profileAvatars.isActive, true));
    }

    const avatars = await this.db.query.profileAvatars.findMany({
      where: conditions.length > 0 ? conditions[0] : undefined,
      orderBy: [desc(profileAvatars.displayOrder), desc(profileAvatars.createdAt)],
    });

    // Convert S3 keys to public URLs
    return {
      message: 'Avatars retrieved successfully',
      data: avatars.map((avatar) => ({
        ...avatar,
        imageUrl: this.s3Service.getPublicUrl(avatar.imageUrl),
      })),
    };
  }

  /**
   * Get a single avatar by ID
   */
  async findOne(id: string) {
    const avatar = await this.db.query.profileAvatars.findFirst({
      where: eq(profileAvatars.id, id),
    });

    if (!avatar) {
      throw new NotFoundException('Avatar not found');
    }

    return {
      message: 'Avatar details retrieved successfully',
      data: {
        ...avatar,
        imageUrl: this.s3Service.getPublicUrl(avatar.imageUrl),
      },
    };
  }

  /**
   * Update avatar metadata (name)
   */
  async update(id: string, dto: UpdateAvatarDto) {
    const existing = await this.db.query.profileAvatars.findFirst({
      where: eq(profileAvatars.id, id),
    });

    if (!existing) {
      throw new NotFoundException('Avatar not found');
    }

    const [updated] = await this.db
      .update(profileAvatars)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(profileAvatars.id, id))
      .returning();

    return {
      ...updated,
      imageUrl: this.s3Service.getPublicUrl(updated.imageUrl),
    };
  }

  /**
   * Toggle avatar active status
   */
  async updateStatus(id: string, isActive: boolean) {
    const existing = await this.db.query.profileAvatars.findFirst({
      where: eq(profileAvatars.id, id),
    });

    if (!existing) {
      throw new NotFoundException('Avatar not found');
    }

    const [updated] = await this.db
      .update(profileAvatars)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(profileAvatars.id, id))
      .returning();

    return {
      ...updated,
      imageUrl: this.s3Service.getPublicUrl(updated.imageUrl),
    };
  }

  /**
   * Update avatar display order
   */
  async updateOrder(id: string, displayOrder: number) {
    const existing = await this.db.query.profileAvatars.findFirst({
      where: eq(profileAvatars.id, id),
    });

    if (!existing) {
      throw new NotFoundException('Avatar not found');
    }

    const [updated] = await this.db
      .update(profileAvatars)
      .set({
        displayOrder,
        updatedAt: new Date(),
      })
      .where(eq(profileAvatars.id, id))
      .returning();

    return {
      ...updated,
      imageUrl: this.s3Service.getPublicUrl(updated.imageUrl),
    };
  }

  /**
   * Delete avatar (soft delete - mark as inactive)
   * This prevents new selections but keeps existing user selections intact
   */
  async delete(id: string) {
    const existing = await this.db.query.profileAvatars.findFirst({
      where: eq(profileAvatars.id, id),
    });

    if (!existing) {
      throw new NotFoundException('Avatar not found');
    }

    // Soft delete: mark as inactive instead of deleting
    await this.db
      .update(profileAvatars)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(profileAvatars.id, id));

    return { message: 'Avatar deleted successfully (marked as inactive)' };
  }
}
