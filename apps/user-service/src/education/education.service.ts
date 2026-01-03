import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateEducationDto } from './dto/create-education.dto';
import { UpdateEducationDto } from './dto/update-education.dto';
import { educationRecords } from '@ai-job-portal/database';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class EducationService {
  private readonly logger = new Logger(EducationService.name);

  constructor(private databaseService: DatabaseService) { }

  async create(profileId: string, createDto: CreateEducationDto[]) {
    const db = this.databaseService.db;

    const values = createDto.map(dto => ({
      profileId,
      level: dto.level,
      institution: dto.institutionName,
      degree: dto.degree,
      fieldOfStudy: dto.fieldOfStudy,
      startDate: dto.startDate ? new Date(dto.startDate).toISOString().split('T')[0] : null,
      endDate: dto.endDate ? new Date(dto.endDate).toISOString().split('T')[0] : null,
      grade: dto.grade,
      honors: dto.honors,
      relevantCoursework: dto.relevantCoursework,
      currentlyStudying: dto.currentlyStudying,
      certificateUrl: dto.certificateUrl,
    }));

    try {
      const education = await db
        .insert(educationRecords)
        .values(values)
        .returning();

      this.logger.log(`Education records created for profile ${profileId}`);
      return education;
    } catch (error: any) {
      this.logger.error(`Failed to create education records: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`, error.stack);
      throw error;
    }
  }

  async findAllByProfile(profileId: string) {
    const db = this.databaseService.db;

    const educations = await db.query.educationRecords.findMany({
      where: eq(educationRecords.profileId, profileId),
      orderBy: (educationRecords, { desc }) => [desc(educationRecords.startDate)],
    });

    return educations;
  }

  async findOne(id: string, profileId: string) {
    const db = this.databaseService.db;

    const education = await db.query.educationRecords.findFirst({
      where: and(eq(educationRecords.id, id), eq(educationRecords.profileId, profileId)),
    });

    if (!education) {
      throw new NotFoundException('Education record not found');
    }

    return education;
  }

  async update(id: string, profileId: string, updateDto: UpdateEducationDto) {
    const db = this.databaseService.db;

    await this.findOne(id, profileId);

    const updateData: any = {
      level: updateDto.level,
      institutionName: updateDto.institutionName,
      degree: updateDto.degree,
      fieldOfStudy: updateDto.fieldOfStudy,
      startDate: updateDto.startDate ? updateDto.startDate.toISOString().split('T')[0] : undefined,
      endDate: updateDto.endDate ? updateDto.endDate.toISOString().split('T')[0] : undefined,
      grade: updateDto.grade,
      honors: updateDto.honors,
      relevantCoursework: updateDto.relevantCoursework,
      certificateUrl: updateDto.certificateUrl,
      updatedAt: new Date(),
    };

    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    const [updated] = await db
      .update(educationRecords)
      .set(updateData)
      .where(and(eq(educationRecords.id, id), eq(educationRecords.profileId, profileId)))
      .returning();

    this.logger.log(`Education record ${id} updated`);
    return updated;
  }

  async delete(id: string, profileId: string) {
    const db = this.databaseService.db;

    await this.findOne(id, profileId);

    await db
      .delete(educationRecords)
      .where(and(eq(educationRecords.id, id), eq(educationRecords.profileId, profileId)));

    this.logger.log(`Education record ${id} deleted`);
    return { message: 'Education record deleted successfully' };
  }
}
