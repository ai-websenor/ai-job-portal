import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, isNotNull, sql, and, or, ilike } from 'drizzle-orm';
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
    const signedUrl = await this.s3Service.getSignedDownloadUrl(key, 3600);

    return {
      message: `Video ${status} successfully`,
      data: {
        profileId: profile.id,
        userId: profile.userId,
        videoUrl: signedUrl,
        videoStatus: status,
        rejectionReason: status === 'rejected' ? rejectionReason : null,
      },
    };
  }

  /**
   * List all video profiles with optional search and status filter.
   */
  async listVideos(
    page = 1,
    limit = 20,
    search?: string,
    status?: 'pending' | 'approved' | 'rejected',
  ) {
    const offset = (page - 1) * limit;

    const conditions: any[] = [isNotNull(profiles.videoResumeUrl)];

    if (status) {
      conditions.push(eq(profiles.videoProfileStatus, status));
    }

    if (search) {
      const like = `%${search}%`;
      conditions.push(
        or(
          ilike(profiles.firstName, like),
          ilike(profiles.lastName, like),
          ilike(profiles.email, like),
          ilike(profiles.userId, like),
        ),
      );
    }

    const whereClause = and(...conditions);

    const [results, totalResult] = await Promise.all([
      this.db.query.profiles.findMany({
        where: whereClause,
        columns: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          email: true,
          videoResumeUrl: true,
          videoProfileStatus: true,
          videoRejectionReason: true,
          videoUploadedAt: true,
        },
        orderBy: (p, { desc }) => [desc(p.videoUploadedAt)],
        limit,
        offset,
      }),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(profiles)
        .where(whereClause),
    ]);

    // Generate signed URLs for each video
    const data = await Promise.all(
      results.map(async (p) => {
        let videoUrl: string | null = null;
        if (p.videoResumeUrl) {
          try {
            const key = this.s3Service.extractKeyFromUrl(p.videoResumeUrl);
            videoUrl = await this.s3Service.getSignedDownloadUrl(key, 3600);
          } catch {
            videoUrl = null;
          }
        }
        return { ...p, videoUrl };
      }),
    );

    const total = Number(totalResult[0]?.count || 0);

    return {
      message: 'Video profiles retrieved successfully',
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
