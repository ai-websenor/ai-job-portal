import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Database, employerProfiles, employerLocations } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';

@Injectable()
export class EmployerService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async createProfile(userId: string, dto: any) {
    const slug = dto.companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const [profile] = await this.db.insert(employerProfiles).values({
      userId,
      companyName: dto.companyName,
      companySlug: `${slug}-${Date.now()}`,
      industry: dto.industry,
      companySize: dto.companySize,
      website: dto.website,
      description: dto.description,
      headquarters: dto.headquarters,
    }).returning();
    return profile;
  }

  async getProfile(userId: string) {
    const profile = await this.db.query.employerProfiles.findFirst({
      where: eq(employerProfiles.userId, userId),
      with: { locations: true, jobs: true },
    });
    if (!profile) throw new NotFoundException('Employer profile not found');
    return profile;
  }

  async updateProfile(userId: string, dto: any) {
    const profile = await this.db.query.employerProfiles.findFirst({
      where: eq(employerProfiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Employer profile not found');

    await this.db.update(employerProfiles)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(employerProfiles.id, profile.id));

    return this.getProfile(userId);
  }

  async addLocation(userId: string, dto: any) {
    const profile = await this.db.query.employerProfiles.findFirst({
      where: eq(employerProfiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    const [location] = await this.db.insert(employerLocations).values({
      employerProfileId: profile.id,
      name: dto.name,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      country: dto.country,
      postalCode: dto.postalCode,
      isPrimary: dto.isPrimary || false,
    }).returning();

    return location;
  }
}
