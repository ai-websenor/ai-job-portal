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
        durationMinutes: scheduleInterviewDto.durationMinutes || 60,
        meetingType: scheduleInterviewDto.meetingType || null, // 'online' | 'offline'
        meetingTool: scheduleInterviewDto.meetingTool || null, // 'Zoom', 'Teams'
        meetingLink: scheduleInterviewDto.location || null, // map location to meetingLink if appropriate, or keep as location
        location: scheduleInterviewDto.location || null,
        notes: scheduleInterviewDto.notes || null,
        status: 'scheduled',
      } as any)
      .returning();

    const { duration: _duration, ...interviewData } = interview as any;
    return {
      message: 'Interview scheduled successfully',
      data: interviewData,
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
    if (updateInterviewDto.durationMinutes) {
      updateData.durationMinutes = updateInterviewDto.durationMinutes;
    }
    if (updateInterviewDto.location) {
      updateData.location = updateInterviewDto.location;
    }
    if (updateInterviewDto.meetingType) {
      updateData.meetingType = updateInterviewDto.meetingType;
    }
    if (updateInterviewDto.meetingTool) {
      updateData.meetingTool = updateInterviewDto.meetingTool;
    }
    if (updateInterviewDto.notes) {
      updateData.notes = updateInterviewDto.notes;
    }

    const [updatedInterview] = await this.db
      .update(schema.interviews)
      .set(updateData)
      .where(eq(schema.interviews.id, interviewId))
      .returning();

    const { duration: _duration, ...updatedData } = updatedInterview as any;
    return {
      message: 'Interview updated successfully',
      data: updatedData,
    };
  }

  async getInterviewsByApplication(applicationId: string) {
    const interviews = await this.db
      .select()
      .from(schema.interviews)
      .where(eq(schema.interviews.applicationId, applicationId));

    return {
      message: 'Interviews retrieved successfully',
      data: interviews.map((interview) => {
        const { duration: _duration, ...rest } = interview as any;
        return rest;
      }),
    };
  }
}
