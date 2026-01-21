import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Database, profiles, resumes } from '@ai-job-portal/database';
import { S3Service } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import { updateOnboardingStep, recalculateOnboardingCompletion } from '../utils/onboarding.helper';

// Map MIME types to file type enum values
const mimeToFileType: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

@Injectable()
export class ResumeService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly s3Service: S3Service,
  ) {}

  async uploadResume(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
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

    const [resume] = await this.db
      .insert(resumes)
      .values({
        profileId: profile.id,
        fileName: file.originalname,
        filePath: uploadResult.url,
        fileSize: file.size,
        fileType: fileType as any,
        isDefault: false,
      })
      .returning();

    await updateOnboardingStep(this.db, userId, 1);

    return resume;
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
}
