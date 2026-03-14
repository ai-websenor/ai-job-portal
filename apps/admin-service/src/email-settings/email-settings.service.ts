import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Database, emailSettings } from '@ai-job-portal/database';
import { S3Service, SesService } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import { UpdateEmailSettingsDto } from './dto';
import type { MultipartFile } from '@fastify/multipart';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

@Injectable()
export class EmailSettingsService {
  private readonly logger = new Logger(EmailSettingsService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly s3Service: S3Service,
    private readonly sesService: SesService,
  ) {}

  async verifyEmail(email: string) {
    this.logger.log(`Sending SES verification email to: ${email}`);
    await this.sesService.verifyEmailIdentity(email);
    return {
      message: `Verification email sent to ${email}. Please check the inbox and click the verification link.`,
    };
  }

  async get() {
    const settings = await this.db.query.emailSettings.findFirst();

    if (!settings) {
      const [created] = await this.db
        .insert(emailSettings)
        .values({
          platformName: 'AI Job Portal',
        })
        .returning();
      return created;
    }

    return settings;
  }

  async update(dto: UpdateEmailSettingsDto) {
    const existing = await this.db.query.emailSettings.findFirst();

    if (!existing) {
      const [created] = await this.db
        .insert(emailSettings)
        .values({
          ...dto,
          platformName: dto.platformName || 'AI Job Portal',
        })
        .returning();
      return created;
    }

    const [updated] = await this.db
      .update(emailSettings)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(emailSettings.id, existing.id))
      .returning();

    return updated;
  }

  async uploadLogo(data: MultipartFile) {
    const buffer = await data.toBuffer();
    this.logger.log(
      `Logo upload: file=${data.filename}, mime=${data.mimetype}, size=${buffer.length} bytes`,
    );

    if (!ALLOWED_IMAGE_TYPES.includes(data.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, WebP allowed');
    }
    if (buffer.length > MAX_IMAGE_SIZE) {
      throw new BadRequestException('File too large. Max 2MB allowed');
    }

    const existing = await this.db.query.emailSettings.findFirst();

    // Delete old logo from S3
    if (existing?.logoUrl) {
      try {
        const oldKey = this.s3Service.extractKeyFromUrl(existing.logoUrl);
        this.logger.log(`Deleting old logo from S3: key=${oldKey}`);
        if (oldKey) {
          await this.s3Service.delete(oldKey);
          this.logger.log(`Old logo deleted: ${oldKey}`);
        }
      } catch (err: any) {
        this.logger.warn(`Failed to delete old logo: ${err.message}`);
      }
    }

    // Upload new logo
    const key = this.s3Service.generateKey('email-settings', data.filename);
    this.logger.log(`Uploading logo to S3: key=${key}`);
    const uploadResult = await this.s3Service.upload(key, buffer, data.mimetype);
    this.logger.log(`Logo uploaded: url=${uploadResult.url}`);

    if (!existing) {
      const [created] = await this.db
        .insert(emailSettings)
        .values({
          platformName: 'AI Job Portal',
          logoUrl: uploadResult.url,
        })
        .returning();
      return { message: 'Logo uploaded successfully', data: created };
    }

    const [updated] = await this.db
      .update(emailSettings)
      .set({
        logoUrl: uploadResult.url,
        updatedAt: new Date(),
      })
      .where(eq(emailSettings.id, existing.id))
      .returning();

    return { message: 'Logo uploaded successfully', data: updated };
  }
}
