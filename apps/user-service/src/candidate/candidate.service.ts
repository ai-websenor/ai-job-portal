import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  Database,
  candidateProfiles,
  candidateExperiences,
  candidateEducation,
  candidateSkills,
} from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateCandidateProfileDto, UpdateCandidateProfileDto, AddExperienceDto, AddEducationDto } from './dto';

@Injectable()
export class CandidateService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async createProfile(userId: string, dto: CreateCandidateProfileDto) {
    const [profile] = await this.db.insert(candidateProfiles).values({
      userId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      headline: dto.headline,
      summary: dto.summary,
      locationCity: dto.locationCity,
      locationState: dto.locationState,
      locationCountry: dto.locationCountry,
    }).returning();
    return profile;
  }

  async getProfile(userId: string) {
    const profile = await this.db.query.candidateProfiles.findFirst({
      where: eq(candidateProfiles.userId, userId),
      with: {
        experiences: true,
        education: true,
        skills: true,
        resumes: true,
      },
    });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateCandidateProfileDto) {
    const profile = await this.db.query.candidateProfiles.findFirst({
      where: eq(candidateProfiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    await this.db.update(candidateProfiles)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(candidateProfiles.id, profile.id));

    return this.getProfile(userId);
  }

  async addExperience(userId: string, dto: AddExperienceDto) {
    const profile = await this.db.query.candidateProfiles.findFirst({
      where: eq(candidateProfiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    const [experience] = await this.db.insert(candidateExperiences).values({
      candidateProfileId: profile.id,
      companyName: dto.companyName,
      title: dto.title,
      employmentType: dto.employmentType as any,
      location: dto.location,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      isCurrent: dto.isCurrent || false,
      description: dto.description,
    } as any).returning();

    return experience;
  }

  async addEducation(userId: string, dto: AddEducationDto) {
    const profile = await this.db.query.candidateProfiles.findFirst({
      where: eq(candidateProfiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    const [education] = await this.db.insert(candidateEducation).values({
      candidateProfileId: profile.id,
      institution: dto.institution,
      degree: dto.degree,
      fieldOfStudy: dto.fieldOfStudy,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      grade: dto.grade,
      description: dto.description,
    }).returning();

    return education;
  }
}
