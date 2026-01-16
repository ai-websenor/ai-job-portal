import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  Database,
  profiles,
  workExperiences,
  educationRecords,
  profileSkills,
} from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateCandidateProfileDto, UpdateCandidateProfileDto, AddExperienceDto, AddEducationDto } from './dto';

@Injectable()
export class CandidateService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async createProfile(userId: string, dto: CreateCandidateProfileDto) {
    const [profile] = await this.db.insert(profiles).values({
      userId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      headline: dto.headline,
      professionalSummary: dto.summary,
      city: dto.locationCity,
      state: dto.locationState,
      country: dto.locationCountry,
    }).returning();
    return profile;
  }

  async getProfile(userId: string) {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
      with: {
        workExperiences: true,
        educationRecords: true,
        profileSkills: true,
        resumes: true,
      },
    });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateCandidateProfileDto) {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    await this.db.update(profiles)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(profiles.id, profile.id));

    return this.getProfile(userId);
  }

  async addExperience(userId: string, dto: AddExperienceDto) {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    const [experience] = await this.db.insert(workExperiences).values({
      profileId: profile.id,
      companyName: dto.companyName,
      jobTitle: dto.title,
      designation: dto.title, // Using title for both jobTitle and designation
      employmentType: dto.employmentType as any,
      location: dto.location,
      startDate: dto.startDate,
      endDate: dto.endDate || null,
      isCurrent: dto.isCurrent || false,
      description: dto.description,
    }).returning();

    return experience;
  }

  async addEducation(userId: string, dto: AddEducationDto) {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    const [education] = await this.db.insert(educationRecords).values({
      profileId: profile.id,
      institution: dto.institution,
      degree: dto.degree,
      fieldOfStudy: dto.fieldOfStudy,
      startDate: dto.startDate,
      endDate: dto.endDate || null,
      grade: dto.grade,
      description: dto.description,
    }).returning();

    return education;
  }
}
