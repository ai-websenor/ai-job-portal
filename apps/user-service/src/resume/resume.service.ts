import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Database, candidateProfiles, candidateResumes } from '@ai-job-portal/database';
import { S3Service } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';

@Injectable()
export class ResumeService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly s3Service: S3Service,
  ) {}

  async uploadResume(userId: string, file: { buffer: Buffer; originalname: string; mimetype: string; size: number }) {
    const profile = await this.db.query.candidateProfiles.findFirst({
      where: eq(candidateProfiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    if (!['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only PDF, DOC, DOCX allowed');
    }

    const key = this.s3Service.generateKey('resumes', file.originalname);
    const uploadResult = await this.s3Service.upload(key, file.buffer, file.mimetype);

    const [resume] = await this.db.insert(candidateResumes).values({
      candidateProfileId: profile.id,
      fileName: file.originalname,
      fileUrl: uploadResult.url,
      fileSize: file.size,
      mimeType: file.mimetype,
      isPrimary: false,
    }).returning();

    return resume;
  }

  async getResumes(userId: string) {
    const profile = await this.db.query.candidateProfiles.findFirst({
      where: eq(candidateProfiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    return this.db.query.candidateResumes.findMany({
      where: eq(candidateResumes.candidateProfileId, profile.id),
    });
  }

  async deleteResume(userId: string, resumeId: string) {
    const profile = await this.db.query.candidateProfiles.findFirst({
      where: eq(candidateProfiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    const resume = await this.db.query.candidateResumes.findFirst({
      where: eq(candidateResumes.id, resumeId),
    });
    if (!resume || resume.candidateProfileId !== profile.id) {
      throw new NotFoundException('Resume not found');
    }

    // Extract key from URL and delete from S3
    const url = new URL(resume.fileUrl);
    const key = url.pathname.slice(1);
    await this.s3Service.delete(key);

    await this.db.delete(candidateResumes).where(eq(candidateResumes.id, resumeId));
    return { message: 'Resume deleted' };
  }

  async setPrimaryResume(userId: string, resumeId: string) {
    const profile = await this.db.query.candidateProfiles.findFirst({
      where: eq(candidateProfiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    // Remove primary from all
    await this.db.update(candidateResumes)
      .set({ isPrimary: false })
      .where(eq(candidateResumes.candidateProfileId, profile.id));

    // Set new primary
    await this.db.update(candidateResumes)
      .set({ isPrimary: true })
      .where(eq(candidateResumes.id, resumeId));

    return { message: 'Primary resume updated' };
  }
}
