import {Inject, Injectable, NotFoundException} from '@nestjs/common';
import {PostgresJsDatabase} from 'drizzle-orm/postgres-js';
import {eq} from 'drizzle-orm';
import * as schema from '@ai-job-portal/database';
import {DATABASE_CONNECTION} from '../database/database.module';
import {UpdateStatusDto} from './dto/update-status.dto';

@Injectable()
export class StatusService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async updateStatus(applicationId: string, updateStatusDto: UpdateStatusDto, user: any) {
    // 1. Validate application exists
    const [application] = await this.db
      .select()
      .from(schema.jobApplications)
      .where(eq(schema.jobApplications.id, applicationId))
      .limit(1);

    if (!application) {
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }

    // 2. Update application status and notes
    const [updatedApplication] = await this.db
      .update(schema.jobApplications)
      .set({
        status: updateStatusDto.status,
        notes: updateStatusDto.notes !== undefined ? updateStatusDto.notes : application.notes,
        updatedAt: new Date(),
      })
      .where(eq(schema.jobApplications.id, applicationId))
      .returning();

    // 3. Create history record
    await this.db.insert(schema.applicationHistory).values({
      applicationId: applicationId,
      changedBy: user.id,
      previousStatus: application.status,
      newStatus: updateStatusDto.status,
      comment: updateStatusDto.notes || null,
    } as any);

    return {
      message: 'Application status updated successfully',
      data: updatedApplication,
    };
  }
}
