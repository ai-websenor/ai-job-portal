import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { UpdateCertificationDto } from './dto/update-certification.dto';
import { certifications } from '@ai-job-portal/database';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class CertificationsService {
  private readonly logger = new Logger(CertificationsService.name);

  constructor(
    private databaseService: DatabaseService,
    private storageService: StorageService,
  ) { }

  async create(profileId: string, createDto: CreateCertificationDto) {
    const db = this.databaseService.db;

    const [certification] = await db
      .insert(certifications)
      .values({
        profileId,
        name: createDto.name,
        issuingOrganization: createDto.issuingOrganization,
        issueDate: createDto.issueDate.toISOString().split('T')[0],
        expiryDate: createDto.expiryDate ? createDto.expiryDate.toISOString().split('T')[0] : null,
        credentialId: createDto.credentialId,
        credentialUrl: createDto.credentialUrl,
        isVerified: createDto.isVerified || false,
      })
      .returning();

    this.logger.log(`Certification created for profile ${profileId}`);
    return certification;
  }

  async findAllByProfile(profileId: string) {
    const db = this.databaseService.db;

    const certs = await db.query.certifications.findMany({
      where: eq(certifications.profileId, profileId),
      orderBy: (certifications, { desc }) => [desc(certifications.issueDate)],
    });

    return certs;
  }

  async findOne(id: string, profileId: string) {
    const db = this.databaseService.db;

    const certification = await db.query.certifications.findFirst({
      where: and(eq(certifications.id, id), eq(certifications.profileId, profileId)),
    });

    if (!certification) {
      throw new NotFoundException('Certification not found');
    }

    return certification;
  }

  async update(id: string, profileId: string, updateDto: UpdateCertificationDto) {
    const db = this.databaseService.db;

    await this.findOne(id, profileId);

    const updateData: any = {
      name: updateDto.name,
      issuingOrganization: updateDto.issuingOrganization,
      issueDate: updateDto.issueDate ? updateDto.issueDate.toISOString().split('T')[0] : undefined,
      expiryDate: updateDto.expiryDate ? updateDto.expiryDate.toISOString().split('T')[0] : undefined,
      credentialId: updateDto.credentialId,
      credentialUrl: updateDto.credentialUrl,
      isVerified: updateDto.isVerified,
      updatedAt: new Date(),
    };

    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    const [updated] = await db
      .update(certifications)
      .set(updateData)
      .where(and(eq(certifications.id, id), eq(certifications.profileId, profileId)))
      .returning();

    this.logger.log(`Certification ${id} updated`);
    return updated;
  }

  async delete(id: string, profileId: string) {
    const db = this.databaseService.db;

    const certification = await this.findOne(id, profileId);

    // Delete certificate file from storage if exists
    if (certification.certificateFile) {
      try {
        const buckets = this.storageService.getBuckets();
        const key = certification.certificateFile.split('/').pop();
        await this.storageService.deleteFile(buckets.certificates, `${profileId}/${key}`);
      } catch (error: any) {
        this.logger.warn(`Failed to delete certificate file: ${error.message}`);
      }
    }

    await db
      .delete(certifications)
      .where(and(eq(certifications.id, id), eq(certifications.profileId, profileId)));

    this.logger.log(`Certification ${id} deleted`);
    return { message: 'Certification deleted successfully' };
  }

  /**
   * Upload certificate file
   */
  async uploadCertificate(id: string, profileId: string, userId: string, file: Buffer, filename: string, contentType: string) {
    const db = this.databaseService.db;

    const certification = await this.findOne(id, profileId);

    // Upload file to MinIO
    const result = await this.storageService.uploadCertificate(userId, file, filename, contentType);

    // Update certification with file URL
    const [updated] = await db
      .update(certifications)
      .set({
        certificateFile: result.url,
        updatedAt: new Date(),
      })
      .where(eq(certifications.id, id))
      .returning();

    this.logger.log(`Certificate file uploaded for certification ${id}`);
    return {
      certification: updated,
      file: result,
    };
  }
}
