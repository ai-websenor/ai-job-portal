import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { Database, profiles, certifications } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateCertificationDto, UpdateCertificationDto } from './dto';

@Injectable()
export class CertificationService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  private async getProfileId(userId: string): Promise<string> {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile.id;
  }

  async create(userId: string, dto: CreateCertificationDto) {
    const profileId = await this.getProfileId(userId);

    const [cert] = await this.db.insert(certifications).values({
      profileId,
      name: dto.name,
      issuingOrganization: dto.issuingOrganization,
      issueDate: dto.issueDate,
      expiryDate: dto.expiryDate || null,
      credentialId: dto.credentialId,
      credentialUrl: dto.credentialUrl,
      certificateFile: dto.certificateFile,
    }).returning();

    return cert;
  }

  async findAll(userId: string) {
    const profileId = await this.getProfileId(userId);

    return this.db.query.certifications.findMany({
      where: eq(certifications.profileId, profileId),
      orderBy: (c, { desc }) => [desc(c.issueDate)],
    });
  }

  async findOne(userId: string, id: string) {
    const profileId = await this.getProfileId(userId);

    const cert = await this.db.query.certifications.findFirst({
      where: and(eq(certifications.id, id), eq(certifications.profileId, profileId)),
    });

    if (!cert) throw new NotFoundException('Certification not found');
    return cert;
  }

  async update(userId: string, id: string, dto: UpdateCertificationDto) {
    const profileId = await this.getProfileId(userId);

    const existing = await this.db.query.certifications.findFirst({
      where: and(eq(certifications.id, id), eq(certifications.profileId, profileId)),
    });

    if (!existing) throw new NotFoundException('Certification not found');

    await this.db.update(certifications)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(certifications.id, id));

    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    const profileId = await this.getProfileId(userId);

    const existing = await this.db.query.certifications.findFirst({
      where: and(eq(certifications.id, id), eq(certifications.profileId, profileId)),
    });

    if (!existing) throw new NotFoundException('Certification not found');

    await this.db.delete(certifications).where(eq(certifications.id, id));

    return { success: true };
  }
}
