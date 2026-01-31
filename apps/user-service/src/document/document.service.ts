import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { Database, profiles, profileDocuments } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { UploadDocumentDto, DocumentQueryDto } from './dto';

@Injectable()
export class DocumentService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  private async getProfileId(userId: string): Promise<string> {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile.id;
  }

  async upload(userId: string, dto: UploadDocumentDto) {
    const profileId = await this.getProfileId(userId);

    const [doc] = await this.db
      .insert(profileDocuments)
      .values({
        profileId,
        documentType: dto.documentType,
        fileName: dto.fileName,
        filePath: dto.filePath,
        fileSize: dto.fileSize,
      })
      .returning();

    return { message: 'Document uploaded successfully', data: doc };
  }

  async findAll(userId: string, query: DocumentQueryDto) {
    const profileId = await this.getProfileId(userId);

    let whereClause = eq(profileDocuments.profileId, profileId);

    if (query.documentType) {
      whereClause = and(whereClause, eq(profileDocuments.documentType, query.documentType))!;
    }

    return this.db.query.profileDocuments.findMany({
      where: whereClause,
      orderBy: (d, { desc }) => [desc(d.uploadedAt)],
    });
  }

  async findOne(userId: string, id: string) {
    const profileId = await this.getProfileId(userId);

    const doc = await this.db.query.profileDocuments.findFirst({
      where: and(eq(profileDocuments.id, id), eq(profileDocuments.profileId, profileId)),
    });

    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async remove(userId: string, id: string) {
    const profileId = await this.getProfileId(userId);

    const existing = await this.db.query.profileDocuments.findFirst({
      where: and(eq(profileDocuments.id, id), eq(profileDocuments.profileId, profileId)),
    });

    if (!existing) throw new NotFoundException('Document not found');

    await this.db.delete(profileDocuments).where(eq(profileDocuments.id, id));

    return { message: 'Document deleted successfully' };
  }
}
