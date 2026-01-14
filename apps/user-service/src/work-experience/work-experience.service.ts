import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateWorkExperienceDto } from './dto/create-work-experience.dto';
import { UpdateWorkExperienceDto } from './dto/update-work-experience.dto';
import { workExperiences } from '@ai-job-portal/database';
import { eq, and } from 'drizzle-orm';
import { CustomLogger } from '@ai-job-portal/logger';
import { calculateDuration } from '@ai-job-portal/common';

@Injectable()
export class WorkExperienceService {
  private readonly logger = new CustomLogger();

  constructor(private databaseService: DatabaseService) {}

  async create(profileId: string, createDto: CreateWorkExperienceDto) {
    const db = this.databaseService.db;

    const [experience] = await db
      .insert(workExperiences)
      .values({
        profileId,
        companyName: createDto.companyName,
        jobTitle: createDto.jobTitle,
        designation: createDto.designation,
        employmentType: createDto.employmentType,
        location: createDto.location,
        isCurrent: createDto.isCurrent ?? false,
        duration: null, // Computed on read, not stored
        isFresher: createDto.isFresher ?? false,
        startDate: createDto.startDate ? createDto.startDate.toISOString().split('T')[0] : null,
        endDate: createDto.isCurrent
          ? null
          : createDto.endDate
            ? createDto.endDate.toISOString().split('T')[0]
            : null,
        description: createDto.description,
        achievements: createDto.achievements,
        skillsUsed: createDto.skillsUsed,
      })
      .returning();

    this.logger.success(
      `Work experience created for profile ${profileId}`,
      'WorkExperienceService',
    );
    return experience;
  }

  async findAllByProfile(profileId: string) {
    const db = this.databaseService.db;

    const experiences = await db.query.workExperiences.findMany({
      where: eq(workExperiences.profileId, profileId),
      orderBy: (workExperiences, { desc }) => [desc(workExperiences.startDate)],
    });

    return experiences.map((exp) => ({
      ...exp,
      duration: calculateDuration(exp.startDate, exp.isCurrent ? null : exp.endDate),
    }));
  }

  async findOne(id: string, profileId: string) {
    const db = this.databaseService.db;

    const experience = await db.query.workExperiences.findFirst({
      where: and(eq(workExperiences.id, id), eq(workExperiences.profileId, profileId)),
    });

    if (!experience) {
      throw new NotFoundException('Work experience not found');
    }

    return {
      ...experience,
      duration: calculateDuration(
        experience.startDate,
        experience.isCurrent ? null : experience.endDate,
      ),
    };
  }

  async update(id: string, profileId: string, updateDto: UpdateWorkExperienceDto) {
    const db = this.databaseService.db;

    await this.findOne(id, profileId); // Check if exists and belongs to user

    const updateData: any = {
      companyName: updateDto.companyName,
      jobTitle: updateDto.jobTitle,
      designation: updateDto.designation,
      employmentType: updateDto.employmentType,
      location: updateDto.location,
      isCurrent: updateDto.isCurrent,
      duration: null, // Reset duration if updated, we rely on calc
      startDate: updateDto.startDate ? updateDto.startDate.toISOString().split('T')[0] : undefined,
      endDate: updateDto.isCurrent
        ? null
        : updateDto.endDate
          ? updateDto.endDate.toISOString().split('T')[0]
          : undefined,
      description: updateDto.description,
      achievements: updateDto.achievements,
      skillsUsed: updateDto.skillsUsed,
      updatedAt: new Date(),
    };

    // Remove undefined values
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key],
    );

    const [updated] = await db
      .update(workExperiences)
      .set(updateData)
      .where(and(eq(workExperiences.id, id), eq(workExperiences.profileId, profileId)))
      .returning();

    this.logger.success(`Work experience ${id} updated`, 'WorkExperienceService');
    return updated;
  }

  async delete(id: string, profileId: string) {
    const db = this.databaseService.db;

    await this.findOne(id, profileId); // Check if exists and belongs to user

    await db
      .delete(workExperiences)
      .where(and(eq(workExperiences.id, id), eq(workExperiences.profileId, profileId)));

    this.logger.success(`Work experience ${id} deleted`, 'WorkExperienceService');
    return { message: 'Work experience deleted successfully' };
  }
}
