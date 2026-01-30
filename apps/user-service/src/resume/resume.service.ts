import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Database, profiles, resumes } from '@ai-job-portal/database';
import { S3Service } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import { updateOnboardingStep, recalculateOnboardingCompletion } from '../utils/onboarding.helper';
import { parseResumeText } from './utils/resume-parser.util';
import { ResumeStructuringService } from './resume-structuring.service';
import { StructuredResumeDataDto } from './dto/resume.dto';

// Map MIME types to file type enum values
const mimeToFileType: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly s3Service: S3Service,
    private readonly resumeStructuringService: ResumeStructuringService,
  ) {}

  async uploadResume(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ): Promise<{
    resume: typeof resumes.$inferSelect;
    structuredData: StructuredResumeDataDto | null;
  }> {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    const fileType = mimeToFileType[file.mimetype];
    if (!fileType) {
      throw new BadRequestException('Invalid file type. Only PDF, DOC, DOCX allowed');
    }

    const key = this.s3Service.generateKey('resumes', file.originalname);
    const uploadResult = await this.s3Service.upload(key, file.buffer, file.mimetype);

    // Set all existing resumes for this profile to non-default
    await this.db
      .update(resumes)
      .set({ isDefault: false })
      .where(eq(resumes.profileId, profile.id));

    // Insert new resume as default
    const [resume] = await this.db
      .insert(resumes)
      .values({
        profileId: profile.id,
        fileName: file.originalname,
        filePath: uploadResult.url,
        fileSize: file.size,
        fileType: fileType as any,
        isDefault: true,
      })
      .returning();

    // Update profile's resumeUrl for backward compatibility
    await this.db
      .update(profiles)
      .set({ resumeUrl: uploadResult.url })
      .where(eq(profiles.id, profile.id));

    await updateOnboardingStep(this.db, userId, 1);

    // Parse and structure resume text, return structured data in response
    const structuredData = await this.parseAndStructureResume(
      resume.id,
      file.buffer,
      file.mimetype,
      file.originalname,
    );

    return { resume, structuredData };
  }

  /**
   * Parses resume text and structures it using AI.
   * Errors are caught and logged - they do not fail the upload.
   */
  private async parseAndStructureResume(
    resumeId: string,
    buffer: Buffer,
    mimeType: string,
    filename: string,
  ): Promise<StructuredResumeDataDto | null> {
    try {
      // Step 1: Parse resume text
      const parseResult = await parseResumeText(buffer, mimeType);

      if (!parseResult.success || !parseResult.text) {
        this.logger.warn(
          `Resume ${resumeId} parsing failed: ${parseResult.error || 'Unknown error'}`,
        );
        return null;
      }

      // Store raw parsed text
      await this.db
        .update(resumes)
        .set({ parsedContent: parseResult.text })
        .where(eq(resumes.id, resumeId));

      this.logger.log(
        `Resume ${resumeId} parsed successfully: ${parseResult.text.length} characters`,
      );

      // Step 2: Structure resume text using Hugging Face NER
      const structuredData = await this.resumeStructuringService.structureResumeText(
        parseResult.text,
        filename,
        mimeType,
      );

      if (!structuredData) {
        this.logger.warn(`Resume ${resumeId} structuring returned null`);
        return null;
      }

      this.logger.log(`Resume ${resumeId} structured successfully`);
      return structuredData;
    } catch (error) {
      // Log error but do not throw - parsing/structuring failures should not affect upload
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Resume ${resumeId} parse/structure error: ${errorMessage}`);
      return null;
    }
  }

  async getResumes(userId: string) {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    return this.db.query.resumes.findMany({
      where: eq(resumes.profileId, profile.id),
    });
  }

  async deleteResume(userId: string, resumeId: string) {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    const resume = await this.db.query.resumes.findFirst({
      where: eq(resumes.id, resumeId),
    });
    if (!resume || resume.profileId !== profile.id) {
      throw new NotFoundException('Resume not found');
    }

    // Extract key from URL and delete from S3
    const url = new URL(resume.filePath);
    const key = url.pathname.slice(1);
    await this.s3Service.delete(key);

    await this.db.delete(resumes).where(eq(resumes.id, resumeId));

    await recalculateOnboardingCompletion(this.db, userId);

    return { message: 'Resume deleted' };
  }

  async setPrimaryResume(userId: string, resumeId: string) {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    // Remove default from all
    await this.db
      .update(resumes)
      .set({ isDefault: false })
      .where(eq(resumes.profileId, profile.id));

    // Set new default
    await this.db.update(resumes).set({ isDefault: true }).where(eq(resumes.id, resumeId));

    return { message: 'Default resume updated' };
  }

  async getResumeDownloadUrl(userId: string, resumeId: string): Promise<{ url: string }> {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    const resume = await this.db.query.resumes.findFirst({
      where: eq(resumes.id, resumeId),
    });
    if (!resume || resume.profileId !== profile.id) {
      throw new NotFoundException('Resume not found');
    }

    // Return permanent public URL for the resume
    const publicUrl = this.s3Service.getPublicUrlFromKeyOrUrl(resume.filePath);

    return { url: publicUrl! };
  }

  async getResumeDownloadUrlByPath(filePath: string): Promise<string> {
    // Return permanent public URL for the resume
    return this.s3Service.getPublicUrlFromKeyOrUrl(filePath)!;
  }
}
