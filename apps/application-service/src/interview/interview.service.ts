import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as schema from '@ai-job-portal/database';
import { DATABASE_CONNECTION } from '../database/database.module';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';

@Injectable()
export class InterviewService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async scheduleInterview(scheduleInterviewDto: ScheduleInterviewDto) {
    // Validate application exists
    const [application] = await this.db
      .select()
      .from(schema.jobApplications)
      .where(eq(schema.jobApplications.id, scheduleInterviewDto.applicationId))
      .limit(1);

    if (!application) {
      throw new NotFoundException(
        `Application with ID ${scheduleInterviewDto.applicationId} not found`,
      );
    }

    // Create interview record
    const [interview] = await this.db
      .insert(schema.interviews)
      .values({
        applicationId: scheduleInterviewDto.applicationId,
        interviewType: scheduleInterviewDto.interviewType,
        scheduledAt: new Date(scheduleInterviewDto.scheduledAt),
        duration: scheduleInterviewDto.duration || 60,
        location: scheduleInterviewDto.location || null,
        status: 'scheduled',
      } as any)
      .returning();

    return {
      message: 'Interview scheduled successfully',
      interview,
    };
  }

  async updateInterview(interviewId: string, updateInterviewDto: UpdateInterviewDto) {
    // Validate interview exists
    const [interview] = await this.db
      .select()
      .from(schema.interviews)
      .where(eq(schema.interviews.id, interviewId))
      .limit(1);

    if (!interview) {
      throw new NotFoundException(`Interview with ID ${interviewId} not found`);
    }

    // Update interview
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updateInterviewDto.interviewType) {
      updateData.interviewType = updateInterviewDto.interviewType;
    }
    if (updateInterviewDto.scheduledAt) {
      updateData.scheduledAt = new Date(updateInterviewDto.scheduledAt);
    }
    if (updateInterviewDto.duration) {
      updateData.duration = updateInterviewDto.duration;
    }
    if (updateInterviewDto.location) {
      updateData.location = updateInterviewDto.location;
    }

    const [updatedInterview] = await this.db
      .update(schema.interviews)
      .set(updateData)
      .where(eq(schema.interviews.id, interviewId))
      .returning();

    return {
      message: 'Interview updated successfully',
      interview: updatedInterview,
    };
  }

  async getInterviewsByApplication(applicationId: string) {
    const interviews = await this.db
      .select()
      .from(schema.interviews)
      .where(eq(schema.interviews.applicationId, applicationId));

    return {
      interviews,
    };
  }
}
