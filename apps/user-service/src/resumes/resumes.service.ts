import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { resumes } from '@ai-job-portal/database';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);
  private readonly MAX_RESUMES = 5;
  private readonly ALLOWED_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

  constructor(
    private databaseService: DatabaseService,
    private storageService: StorageService,
  ) { }

  /**
   * Upload a resume file
   */
  async uploadResume(
    profileId: string,
    userId: string,
    file: Buffer,
    filename: string,
    contentType: string,
    createDto: CreateResumeDto,
  ) {
    const db = this.databaseService.db;

    // Check if user has reached max resumes limit
    const existingResumes = await this.findAllByProfile(profileId);
    if (existingResumes.length >= this.MAX_RESUMES) {
      throw new BadRequestException(`Maximum ${this.MAX_RESUMES} resumes allowed per profile`);
    }

    // Validate file type
    if (!this.ALLOWED_TYPES.includes(contentType)) {
      throw new BadRequestException('Invalid file type. Only PDF, DOC, and DOCX files are allowed');
    }

    // Determine file type enum
    let fileType: 'pdf' | 'doc' | 'docx';
    if (contentType === 'application/pdf') {
      fileType = 'pdf';
    } else if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      fileType = 'docx';
    } else {
      fileType = 'doc';
    }

    // Upload file to MinIO
    const uploadResult = await this.storageService.uploadResume(userId, file, filename, contentType);

    // If this is set as default, unset other defaults
    if (createDto.isDefault) {
      await db
        .update(resumes)
        .set({ isDefault: false })
        .where(eq(resumes.profileId, profileId));
    }

    // Create resume record
    const [resume] = await db
      .insert(resumes)
      .values({
        profileId,
        fileName: filename,
        filePath: uploadResult.key,
        fileSize: uploadResult.size,
        fileType,
        resumeName: createDto.resumeName,
        isDefault: createDto.isDefault || false,
        isBuiltWithBuilder: createDto.isBuiltWithBuilder || false,
      })
      .returning();

    this.logger.log(`Resume uploaded for profile ${profileId}`);

    return {
      resume,
      file: uploadResult,
    };
  }

  /**
   * Get all resumes for a profile
   */
  async findAllByProfile(profileId: string) {
    const db = this.databaseService.db;

    const userResumes = await db.query.resumes.findMany({
      where: eq(resumes.profileId, profileId),
      orderBy: (resumes, { desc }) => [desc(resumes.isDefault), desc(resumes.createdAt)],
    });

    return userResumes;
  }

  /**
   * Get a specific resume
   */
  async findOne(id: string, profileId: string) {
    const db = this.databaseService.db;

    const resume = await db.query.resumes.findFirst({
      where: and(eq(resumes.id, id), eq(resumes.profileId, profileId)),
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    return resume;
  }

  /**
   * Update resume metadata
   */
  async update(id: string, profileId: string, updateDto: UpdateResumeDto) {
    const db = this.databaseService.db;

    await this.findOne(id, profileId);

    // If setting as default, unset other defaults
    if (updateDto.isDefault) {
      await db
        .update(resumes)
        .set({ isDefault: false })
        .where(eq(resumes.profileId, profileId));
    }

    const updateData: any = {
      resumeName: updateDto.resumeName,
      isDefault: updateDto.isDefault,
      isBuiltWithBuilder: updateDto.isBuiltWithBuilder,
      updatedAt: new Date(),
    };

    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    const [updated] = await db
      .update(resumes)
      .set(updateData)
      .where(and(eq(resumes.id, id), eq(resumes.profileId, profileId)))
      .returning();

    this.logger.log(`Resume ${id} updated`);
    return updated;
  }

  /**
   * Delete resume
   */
  async delete(id: string, profileId: string) {
    const db = this.databaseService.db;

    const resume = await this.findOne(id, profileId);

    // Delete file from storage
    try {
      const buckets = this.storageService.getBuckets();
      await this.storageService.deleteFile(buckets.resumes, resume.filePath);
    } catch (error: any) {
      this.logger.warn(`Failed to delete resume file from storage: ${error.message}`);
    }

    await db
      .delete(resumes)
      .where(and(eq(resumes.id, id), eq(resumes.profileId, profileId)));

    this.logger.log(`Resume ${id} deleted`);
    return { message: 'Resume deleted successfully' };
  }

  /**
   * Set a resume as default
   */
  async setDefault(id: string, profileId: string) {
    const db = this.databaseService.db;

    await this.findOne(id, profileId);

    // Unset all defaults
    await db
      .update(resumes)
      .set({ isDefault: false })
      .where(eq(resumes.profileId, profileId));

    // Set this one as default
    const [updated] = await db
      .update(resumes)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(resumes.id, id))
      .returning();

    this.logger.log(`Resume ${id} set as default`);
    return updated;
  }

  /**
   * Get download URL for a resume
   */
  async getDownloadUrl(id: string, profileId: string, expiresIn: number = 3600) {
    const resume = await this.findOne(id, profileId);

    const buckets = this.storageService.getBuckets();
    const url = await this.storageService.getPresignedUrl(buckets.resumes, resume.filePath, expiresIn);

    return {
      url,
      expiresIn,
      resume: {
        id: resume.id,
        fileName: resume.fileName,
        fileSize: resume.fileSize,
        fileType: resume.fileType,
      },
    };
  }
}
