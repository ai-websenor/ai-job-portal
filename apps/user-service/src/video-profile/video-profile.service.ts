import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Database, profiles } from '@ai-job-portal/database';
import { S3Service } from '@ai-job-portal/aws';
import { FastifyRequest } from 'fastify';
import { DATABASE_CLIENT } from '../database/database.module';

const ALLOWED_VIDEO_TYPES = ['video/mp4'];
const MAX_VIDEO_SIZE = 225 * 1024 * 1024; // 225MB
const MIN_DURATION_SECONDS = 30;
const MAX_DURATION_SECONDS = 120;

/**
 * Parses an MP4 buffer to extract the video duration in seconds.
 * Scans for the 'mvhd' atom signature and reads timescale/duration fields.
 * Handles both version 0 (32-bit) and version 1 (64-bit) mvhd atoms.
 */
function getMP4Duration(buffer: Buffer): number | null {
  const mvhdSig = Buffer.from('mvhd', 'ascii');

  for (let i = 0; i < buffer.length - 40; i++) {
    if (
      buffer[i] === mvhdSig[0] &&
      buffer[i + 1] === mvhdSig[1] &&
      buffer[i + 2] === mvhdSig[2] &&
      buffer[i + 3] === mvhdSig[3]
    ) {
      const dataStart = i + 4;
      if (dataStart + 24 > buffer.length) continue;

      const version = buffer[dataStart];
      let timescale: number;
      let duration: number;

      if (version === 0) {
        if (dataStart + 20 > buffer.length) continue;
        timescale = buffer.readUInt32BE(dataStart + 12);
        duration = buffer.readUInt32BE(dataStart + 16);
      } else {
        if (dataStart + 28 > buffer.length) continue;
        timescale = buffer.readUInt32BE(dataStart + 20);
        const high = buffer.readUInt32BE(dataStart + 24);
        const low = buffer.readUInt32BE(dataStart + 28);
        duration = high * 4294967296 + low;
      }

      if (timescale > 0 && duration > 0) {
        return duration / timescale;
      }
    }
  }

  return null;
}

interface FilePayload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class VideoProfileService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Extract file from Fastify multipart request and return a normalized payload.
   */
  private async extractFile(req: FastifyRequest): Promise<FilePayload> {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException('No file uploaded');
    }
    const buffer = await data.toBuffer();
    return {
      buffer,
      originalname: data.filename,
      mimetype: data.mimetype,
      size: buffer.length,
    };
  }

  /**
   * Validate file type, extension, size, and duration.
   */
  private validateVideoFile(file: FilePayload): number {
    if (!ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only MP4 format is allowed');
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext !== 'mp4') {
      throw new BadRequestException('Invalid file extension. Only .mp4 files are allowed');
    }

    if (file.size > MAX_VIDEO_SIZE) {
      throw new BadRequestException('File too large. Maximum size is 225MB');
    }

    const duration = getMP4Duration(file.buffer);
    if (duration === null) {
      throw new BadRequestException('Could not read video duration. File may be corrupt');
    }
    if (duration < MIN_DURATION_SECONDS) {
      throw new BadRequestException(
        `Video is too short (${Math.round(duration)}s). Minimum duration is ${MIN_DURATION_SECONDS} seconds`,
      );
    }
    if (duration > MAX_DURATION_SECONDS) {
      throw new BadRequestException(
        `Video is too long (${Math.round(duration)}s). Maximum duration is ${MAX_DURATION_SECONDS} seconds`,
      );
    }

    return duration;
  }

  private async getProfileByUserId(userId: string) {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  /**
   * Delete old video from S3 if exists on the profile.
   */
  private async deleteOldVideo(videoResumeUrl: string | null): Promise<void> {
    if (!videoResumeUrl) return;
    try {
      await this.s3Service.delete(this.s3Service.extractKeyFromUrl(videoResumeUrl));
    } catch {
      // Ignore delete errors
    }
  }

  /**
   * Upload a new video and save to profile.
   * If a video already exists, deletes the old one and resets status.
   */
  private async processAndSaveVideo(userId: string, file: FilePayload) {
    const duration = this.validateVideoFile(file);
    const profile = await this.getProfileByUserId(userId);

    // Delete old video from S3 if exists
    await this.deleteOldVideo(profile.videoResumeUrl);

    // Upload new video to S3
    const key = this.s3Service.generateKey('video-profiles', file.originalname);
    await this.s3Service.upload(key, file.buffer, file.mimetype);

    // Update profile: store S3 key, reset status to pending, clear rejection reason
    await this.db
      .update(profiles)
      .set({
        videoResumeUrl: key,
        videoProfileStatus: 'pending',
        videoRejectionReason: null,
        videoUploadedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, profile.id));

    return {
      message: 'Video uploaded successfully. Pending admin approval.',
      data: {
        videoUrl: await this.s3Service.getSignedDownloadUrl(key, 3600),
        videoStatus: 'pending',
        rejectionReason: null,
        videoUploadedAt: new Date().toISOString(),
        durationSeconds: Math.round(duration),
      },
    };
  }

  /**
   * Upload or record a new video profile.
   */
  async uploadVideo(userId: string, req: FastifyRequest) {
    const file = await this.extractFile(req);
    return this.processAndSaveVideo(userId, file);
  }

  /**
   * Replace existing video profile with a new one.
   * Deletes old S3 file, uploads new, resets status to pending.
   */
  async updateVideo(userId: string, req: FastifyRequest) {
    const profile = await this.getProfileByUserId(userId);
    if (!profile.videoResumeUrl) {
      throw new NotFoundException('No existing video to update. Use upload instead.');
    }

    const file = await this.extractFile(req);
    return this.processAndSaveVideo(userId, file);
  }

  /**
   * Delete the candidate's video profile.
   */
  async deleteVideo(userId: string) {
    const profile = await this.getProfileByUserId(userId);

    if (!profile.videoResumeUrl) {
      throw new NotFoundException('No video profile found');
    }

    await this.deleteOldVideo(profile.videoResumeUrl);

    await this.db
      .update(profiles)
      .set({
        videoResumeUrl: null,
        videoProfileStatus: null,
        videoRejectionReason: null,
        videoUploadedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, profile.id));

    return { message: 'Video profile deleted successfully' };
  }

  /**
   * Generate a presigned S3 upload URL for video upload.
   */
  async getPresignedUploadUrl(
    userId: string,
    fileName: string,
    contentType: string,
    fileSize: number,
    durationSeconds: number,
  ): Promise<{ uploadUrl: string; key: string; expiresIn: number }> {
    await this.getProfileByUserId(userId);

    if (!ALLOWED_VIDEO_TYPES.includes(contentType)) {
      throw new BadRequestException('Invalid file type. Only MP4 format is allowed');
    }

    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext !== 'mp4') {
      throw new BadRequestException('Invalid file extension. Only .mp4 files are allowed');
    }

    if (fileSize > MAX_VIDEO_SIZE) {
      throw new BadRequestException('File too large. Maximum size is 225MB');
    }

    if (durationSeconds < MIN_DURATION_SECONDS) {
      throw new BadRequestException(
        `Video is too short. Minimum duration is ${MIN_DURATION_SECONDS} seconds`,
      );
    }
    if (durationSeconds > MAX_DURATION_SECONDS) {
      throw new BadRequestException(
        `Video is too long. Maximum duration is ${MAX_DURATION_SECONDS} seconds`,
      );
    }

    const key = this.s3Service.generateKey('video-profiles', fileName);
    const expiresIn = 600; // 10 minutes (videos are large)
    const uploadUrl = await this.s3Service.getSignedUploadUrl(key, contentType, expiresIn);

    return { uploadUrl, key, expiresIn };
  }

  /**
   * Confirm a presigned video upload: verify in S3, save to profile, set pending status.
   */
  async confirmVideoUpload(userId: string, key: string, fileName: string, durationSeconds: number) {
    if (!key.startsWith('video-profiles/')) {
      throw new BadRequestException('Invalid S3 key prefix');
    }

    // Verify file exists in S3
    let headResult: { size: number; contentType: string | undefined };
    try {
      headResult = await this.s3Service.headObject(key);
    } catch {
      throw new BadRequestException('File not found in S3. Upload may have failed or expired.');
    }

    if (headResult.size > MAX_VIDEO_SIZE) {
      await this.s3Service.delete(key);
      throw new BadRequestException('Uploaded file exceeds 225MB limit');
    }

    if (durationSeconds < MIN_DURATION_SECONDS || durationSeconds > MAX_DURATION_SECONDS) {
      await this.s3Service.delete(key);
      throw new BadRequestException(
        `Video duration ${Math.round(durationSeconds)}s outside allowed range (${MIN_DURATION_SECONDS}-${MAX_DURATION_SECONDS}s)`,
      );
    }

    const profile = await this.getProfileByUserId(userId);

    // Delete old video if exists
    await this.deleteOldVideo(profile.videoResumeUrl);

    // Update profile
    await this.db
      .update(profiles)
      .set({
        videoResumeUrl: key,
        videoProfileStatus: 'pending',
        videoRejectionReason: null,
        videoUploadedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, profile.id));

    console.log('Video uploaded successfully>>');

    return {
      message: 'Video uploaded successfully. Pending admin approval.',
      data: {
        videoStatus: 'pending',
        rejectionReason: null,
        videoUploadedAt: new Date().toISOString(),
        durationSeconds: Math.round(durationSeconds),
      },
    };
  }

  /**
   * Get a signed download URL for the candidate's own video.
   */
  async getDownloadUrl(userId: string) {
    const profile = await this.getProfileByUserId(userId);

    if (!profile.videoResumeUrl) {
      throw new NotFoundException('No video profile found');
    }

    const key = this.s3Service.extractKeyFromUrl(profile.videoResumeUrl);
    const signedUrl = await this.s3Service.getSignedDownloadUrl(key, 3600);

    return {
      message: 'Download URL generated successfully',
      data: {
        downloadUrl: signedUrl,
        videoStatus: profile.videoProfileStatus,
        rejectionReason: profile.videoRejectionReason,
        expiresInSeconds: 3600,
      },
    };
  }

  /**
   * Get video for viewing by employer or admin.
   * Employers can only see approved videos. Admins can see all.
   */
  async getVideoForViewer(profileId: string, viewer: { sub: string; role: string }) {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.id, profileId),
    });

    if (!profile) throw new NotFoundException('Profile not found');
    if (!profile.videoResumeUrl) throw new NotFoundException('No video profile found');

    const viewerRole = viewer.role;
    const key = this.s3Service.extractKeyFromUrl(profile.videoResumeUrl);

    // Admin can view any video regardless of status
    if (viewerRole === 'admin' || viewerRole === 'super_admin') {
      return {
        message: 'Video retrieved successfully',
        data: {
          profileId: profile.id,
          videoUrl: await this.s3Service.getSignedDownloadUrl(key, 3600),
          videoStatus: profile.videoProfileStatus,
          rejectionReason: profile.videoRejectionReason,
          videoUploadedAt: profile.videoUploadedAt,
        },
      };
    }

    // Employer can only view approved videos
    if (profile.videoProfileStatus !== 'approved') {
      throw new ForbiddenException('Video is not available for viewing');
    }

    if (profile.visibility === 'private') {
      throw new ForbiddenException('This profile is private');
    }

    return {
      message: 'Video retrieved successfully',
      data: {
        profileId: profile.id,
        videoUrl: await this.s3Service.getSignedDownloadUrl(key, 3600),
        videoStatus: profile.videoProfileStatus,
        videoUploadedAt: profile.videoUploadedAt,
      },
    };
  }

  /**
   * Admin: Update video moderation status.
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
        videoUrl: await this.s3Service.getSignedDownloadUrl(key, 3600),
        videoStatus: status,
        rejectionReason: status === 'rejected' ? rejectionReason : null,
      },
    };
  }
}
