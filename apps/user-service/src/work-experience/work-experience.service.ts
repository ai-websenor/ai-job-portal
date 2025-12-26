import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateWorkExperienceDto } from './dto/create-work-experience.dto';
import { UpdateWorkExperienceDto } from './dto/update-work-experience.dto';
import { workExperiences } from '@ai-job-portal/database';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class WorkExperienceService {
  private readonly logger = new Logger(WorkExperienceService.name);

  constructor(private databaseService: DatabaseService) { }

  async create(profileId: string, createDto: CreateWorkExperienceDto) {
    const db = this.databaseService.db;

    const [experience] = await db
      .insert(workExperiences)
      .values({
        profileId,
        companyName: createDto.companyName,
        jobTitle: createDto.jobTitle,
        employmentType: createDto.employmentType,
        location: createDto.location,
        isCurrent: createDto.isCurrent,
        duration: createDto.duration,
        isFresher: createDto.isFresher,
        startDate: createDto.startDate ? createDto.startDate.toISOString().split('T')[0] : null,
        endDate: createDto.endDate ? createDto.endDate.toISOString().split('T')[0] : null,
        description: createDto.description,
        achievements: createDto.achievements,
        skillsUsed: createDto.skillsUsed,
      })
      .returning();

    this.logger.log(`Work experience created for profile ${profileId}`);
    return experience;
  }

  async findAllByProfile(profileId: string) {
    const db = this.databaseService.db;

    const experiences = await db.query.workExperiences.findMany({
      where: eq(workExperiences.profileId, profileId),
      orderBy: (workExperiences, { desc }) => [desc(workExperiences.startDate)],
    });

    return experiences;
  }

  async findOne(id: string, profileId: string) {
    const db = this.databaseService.db;

    const experience = await db.query.workExperiences.findFirst({
      where: and(eq(workExperiences.id, id), eq(workExperiences.profileId, profileId)),
    });

    if (!experience) {
      throw new NotFoundException('Work experience not found');
    }

    return experience;
  }

  async update(id: string, profileId: string, updateDto: UpdateWorkExperienceDto) {
    const db = this.databaseService.db;

    await this.findOne(id, profileId); // Check if exists and belongs to user

    const updateData: any = {
      companyName: updateDto.companyName,
      jobTitle: updateDto.jobTitle,
      employmentType: updateDto.employmentType,
      location: updateDto.location,
      isCurrent: updateDto.isCurrent,
      startDate: updateDto.startDate ? updateDto.startDate.toISOString().split('T')[0] : undefined,
      endDate: updateDto.endDate ? updateDto.endDate.toISOString().split('T')[0] : undefined,
      description: updateDto.description,
      achievements: updateDto.achievements,
      skillsUsed: updateDto.skillsUsed,
      updatedAt: new Date(),
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    const [updated] = await db
      .update(workExperiences)
      .set(updateData)
      .where(and(eq(workExperiences.id, id), eq(workExperiences.profileId, profileId)))
      .returning();

    this.logger.log(`Work experience ${id} updated`);
    return updated;
  }

  async delete(id: string, profileId: string) {
    const db = this.databaseService.db;

    await this.findOne(id, profileId); // Check if exists and belongs to user

    await db
      .delete(workExperiences)
      .where(and(eq(workExperiences.id, id), eq(workExperiences.profileId, profileId)));

    this.logger.log(`Work experience ${id} deleted`);
    return { message: 'Work experience deleted successfully' };
  }
}
