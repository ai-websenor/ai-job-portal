import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, isNotNull, sql } from 'drizzle-orm';
import { Database, profiles } from '@ai-job-portal/database';
import { S3Service } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';

@Injectable()
export class VideoModerationService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Update video moderation status (approve or reject).
   */
  async updateVideoStatus(
    profileId: string,
    status: 'approved' | 'rejected',
    rejectionReason?: string,
  ) {
    if (status === 'rejected' && !rejectionReason) {
      throw new BadRequestException('Rejection reason is required when rejecting a video');
    }

    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.id, profileId),
    });

    if (!profile) throw new NotFoundException('Profile not found');
    if (!profile.videoResumeUrl) {
      throw new NotFoundException('No video profile found for this user');
    }

    const updateData: Record<string, any> = {
      videoProfileStatus: status,
      updatedAt: new Date(),
    };

    if (status === 'rejected') {
      updateData.videoRejectionReason = rejectionReason;
    } else {
      updateData.videoRejectionReason = null;
    }

    await this.db.update(profiles).set(updateData).where(eq(profiles.id, profile.id));

    const key = this.s3Service.extractKeyFromUrl(profile.videoResumeUrl);
    return {
      message: `Video ${status} successfully`,
      data: {
        profileId: profile.id,
        userId: profile.userId,
        videoUrl: this.s3Service.getPublicUrl(key),
        videoStatus: status,
        rejectionReason: status === 'rejected' ? rejectionReason : null,
      },
    };
  }

  /**
   * List all videos pending moderation.
   */
  async listPendingVideos(page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const results = await this.db.query.profiles.findMany({
      where: isNotNull(profiles.videoResumeUrl),
      columns: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        videoResumeUrl: true,
        videoProfileStatus: true,
        videoRejectionReason: true,
        videoUploadedAt: true,
      },
      orderBy: (p, { desc }) => [desc(p.videoUploadedAt)],
      limit,
      offset,
    });

    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(profiles)
      .where(isNotNull(profiles.videoResumeUrl));

    // Convert S3 keys to public URLs
    const data = results.map((p) => ({
      ...p,
      videoUrl: this.s3Service.getPublicUrlFromKeyOrUrl(p.videoResumeUrl),
    }));

    return {
      message: 'Video profiles retrieved successfully',
      data,
      meta: {
        total: Number(totalResult[0]?.count || 0),
        page,
        limit,
        totalPages: Math.ceil(Number(totalResult[0]?.count || 0) / limit),
      },
    };
  }
}
