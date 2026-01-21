import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  Database,
  profiles,
  workExperiences,
  educationRecords,
  profileViews,
} from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import {
  CreateCandidateProfileDto,
  UpdateCandidateProfileDto,
  AddExperienceDto,
  AddEducationDto,
  UpdateExperienceDto,
  UpdateEducationDto,
  ProfileViewQueryDto,
} from './dto';

@Injectable()
export class CandidateService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  private async getProfileId(userId: string): Promise<string> {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile.id;
  }

  async createProfile(userId: string, dto: CreateCandidateProfileDto) {
    const [profile] = await this.db
      .insert(profiles)
      .values({
        userId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        headline: dto.headline,
        professionalSummary: dto.summary,
        city: dto.locationCity,
        state: dto.locationState,
        country: dto.locationCountry,
      })
      .returning();
    return { message: 'Profile created successfully', data: profile };
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

    await this.db
      .update(profiles)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(profiles.id, profile.id));

    return this.getProfile(userId);
  }

  // Work Experience CRUD
  async addExperience(userId: string, dto: AddExperienceDto) {
    const profileId = await this.getProfileId(userId);

    const [experience] = await this.db
      .insert(workExperiences)
      .values({
        profileId,
        companyName: dto.companyName,
        jobTitle: dto.title,
        designation: dto.title,
        employmentType: dto.employmentType as any,
        location: dto.location,
        startDate: dto.startDate,
        endDate: dto.endDate || null,
        isCurrent: dto.isCurrent || false,
        description: dto.description,
        achievements: dto.achievements,
        skillsUsed: dto.skillsUsed,
        displayOrder: dto.displayOrder || 0,
      })
      .returning();

    return { message: 'Experience added successfully', data: experience };
  }

  async getExperiences(userId: string) {
    const profileId = await this.getProfileId(userId);

    return this.db.query.workExperiences.findMany({
      where: eq(workExperiences.profileId, profileId),
      orderBy: (e, { asc }) => [asc(e.displayOrder), desc(e.startDate)],
    });
  }

  async getExperience(userId: string, id: string) {
    const profileId = await this.getProfileId(userId);

    const exp = await this.db.query.workExperiences.findFirst({
      where: and(eq(workExperiences.id, id), eq(workExperiences.profileId, profileId)),
    });

    if (!exp) throw new NotFoundException('Experience not found');
    return exp;
  }

  async updateExperience(userId: string, id: string, dto: UpdateExperienceDto) {
    const profileId = await this.getProfileId(userId);

    const existing = await this.db.query.workExperiences.findFirst({
      where: and(eq(workExperiences.id, id), eq(workExperiences.profileId, profileId)),
    });

    if (!existing) throw new NotFoundException('Experience not found');

    const updateData: Record<string, any> = { ...dto, updatedAt: new Date() };
    if (dto.title) {
      updateData.jobTitle = dto.title;
      updateData.designation = dto.title;
    }

    await this.db.update(workExperiences).set(updateData).where(eq(workExperiences.id, id));

    return this.getExperience(userId, id);
  }

  async removeExperience(userId: string, id: string) {
    const profileId = await this.getProfileId(userId);

    const existing = await this.db.query.workExperiences.findFirst({
      where: and(eq(workExperiences.id, id), eq(workExperiences.profileId, profileId)),
    });

    if (!existing) throw new NotFoundException('Experience not found');

    await this.db.delete(workExperiences).where(eq(workExperiences.id, id));

    return { success: true };
  }

  // Education CRUD
  async addEducation(userId: string, dto: AddEducationDto) {
    const profileId = await this.getProfileId(userId);

    const [education] = await this.db
      .insert(educationRecords)
      .values({
        profileId,
        institution: dto.institution,
        degree: dto.degree,
        fieldOfStudy: dto.fieldOfStudy,
        startDate: dto.startDate,
        endDate: dto.endDate || null,
        grade: dto.grade,
        description: dto.description,
        honors: dto.honors,
        relevantCoursework: dto.relevantCoursework,
        currentlyStudying: dto.currentlyStudying || false,
        displayOrder: dto.displayOrder || 0,
      })
      .returning();

    return education;
  }

  async getEducations(userId: string) {
    const profileId = await this.getProfileId(userId);

    return this.db.query.educationRecords.findMany({
      where: eq(educationRecords.profileId, profileId),
      orderBy: (e, { asc, desc }) => [asc(e.displayOrder), desc(e.endDate)],
    });
  }

  async getEducation(userId: string, id: string) {
    const profileId = await this.getProfileId(userId);

    const edu = await this.db.query.educationRecords.findFirst({
      where: and(eq(educationRecords.id, id), eq(educationRecords.profileId, profileId)),
    });

    if (!edu) throw new NotFoundException('Education not found');
    return edu;
  }

  async updateEducation(userId: string, id: string, dto: UpdateEducationDto) {
    const profileId = await this.getProfileId(userId);

    const existing = await this.db.query.educationRecords.findFirst({
      where: and(eq(educationRecords.id, id), eq(educationRecords.profileId, profileId)),
    });

    if (!existing) throw new NotFoundException('Education not found');

    await this.db
      .update(educationRecords)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(educationRecords.id, id));

    return this.getEducation(userId, id);
  }

  async removeEducation(userId: string, id: string) {
    const profileId = await this.getProfileId(userId);

    const existing = await this.db.query.educationRecords.findFirst({
      where: and(eq(educationRecords.id, id), eq(educationRecords.profileId, profileId)),
    });

    if (!existing) throw new NotFoundException('Education not found');

    await this.db.delete(educationRecords).where(eq(educationRecords.id, id));

    return { success: true };
  }

  // Profile Views
  async getProfileViews(userId: string, query: ProfileViewQueryDto) {
    const profileId = await this.getProfileId(userId);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const views = await this.db.query.profileViews.findMany({
      where: eq(profileViews.profileId, profileId),
      orderBy: (v, { desc }) => [desc(v.viewedAt)],
      limit,
      offset,
    });

    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(profileViews)
      .where(eq(profileViews.profileId, profileId));

    return {
      data: views,
      meta: {
        total: Number(totalResult[0]?.count || 0),
        page,
        limit,
        totalPages: Math.ceil(Number(totalResult[0]?.count || 0) / limit),
      },
    };
  }
}
