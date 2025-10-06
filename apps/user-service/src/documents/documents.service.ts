import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { profileDocuments } from '@ai-job-portal/database';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly MAX_DOCUMENTS = 10;
  private readonly ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  constructor(
    private databaseService: DatabaseService,
    private storageService: StorageService,
  ) { }

  async uploadDocument(
    profileId: string,
    userId: string,
    file: Buffer,
    filename: string,
    contentType: string,
    documentType: 'resume' | 'cover_letter' | 'certificate' | 'id_proof' | 'portfolio' | 'other',
  ) {
    const db = this.databaseService.db;

    // Check max limit
    const existing = await this.findAllByProfile(profileId);
    if (existing.length >= this.MAX_DOCUMENTS) {
      throw new BadRequestException(`Maximum ${this.MAX_DOCUMENTS} documents allowed per profile`);
    }

    // Validate file type
    if (!this.ALLOWED_TYPES.includes(contentType)) {
      throw new BadRequestException('Invalid file type');
    }

    // Upload to MinIO
    const uploadResult = await this.storageService.uploadDocument(userId, file, filename, contentType);

    // Create document record
    const [document] = await db
      .insert(profileDocuments)
      .values({
        profileId,
        documentType,
        fileName: filename,
        filePath: uploadResult.key,
        fileSize: uploadResult.size,
      })
      .returning();

    this.logger.log(`Document uploaded for profile ${profileId}`);

    return {
      document,
      file: uploadResult,
    };
  }

  async findAllByProfile(profileId: string) {
    const db = this.databaseService.db;

    return await db.query.profileDocuments.findMany({
      where: eq(profileDocuments.profileId, profileId),
      orderBy: (profileDocuments, { desc }) => [desc(profileDocuments.uploadedAt)],
    });
  }

  async findOne(id: string, profileId: string) {
    const db = this.databaseService.db;

    const document = await db.query.profileDocuments.findFirst({
      where: and(eq(profileDocuments.id, id), eq(profileDocuments.profileId, profileId)),
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async delete(id: string, profileId: string) {
    const db = this.databaseService.db;

    const document = await this.findOne(id, profileId);

    // Delete from storage
    try {
      const buckets = this.storageService.getBuckets();
      await this.storageService.deleteFile(buckets.documents, document.filePath);
    } catch (error: any) {
      this.logger.warn(`Failed to delete document file: ${error.message}`);
    }

    await db
      .delete(profileDocuments)
      .where(and(eq(profileDocuments.id, id), eq(profileDocuments.profileId, profileId)));

    this.logger.log(`Document ${id} deleted`);
    return { message: 'Document deleted successfully' };
  }

  async getDownloadUrl(id: string, profileId: string, expiresIn: number = 3600) {
    const document = await this.findOne(id, profileId);

    const buckets = this.storageService.getBuckets();
    const url = await this.storageService.getPresignedUrl(buckets.documents, document.filePath, expiresIn);

    return {
      url,
      expiresIn,
      document: {
        id: document.id,
        fileName: document.fileName,
        fileSize: document.fileSize,
        documentType: document.documentType,
      },
    };
  }
}
