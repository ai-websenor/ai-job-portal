import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, sql } from 'drizzle-orm';
import * as schema from '@ai-job-portal/database';
import { DATABASE_CONNECTION } from '../database/database.module';
import { UpdateStatusDto } from './dto/update-status.dto';

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

    // 2. Determine actor role and validate permissions
    const candidateAllowedStatuses = ['applied', 'withdrawn', 'offer_accepted', 'offer_rejected'];
    const employerAllowedStatuses = [
      'viewed',
      'shortlisted',
      'interview_scheduled',
      'rejected',
      'hired',
    ];

    let actor: 'candidate' | 'employer';
    const newStatus = updateStatusDto.status;

    // Check if user is the candidate who applied
    const isCandidateUser = user.id === application.jobSeekerId;

    if (isCandidateUser) {
      actor = 'candidate';
      if (!candidateAllowedStatuses.includes(newStatus)) {
        throw new ForbiddenException(
          `Candidates can only set status to: ${candidateAllowedStatuses.join(', ')}`,
        );
      }
    } else {
      // User is employer - verify they own the job
      const [job] = await this.db
        .select({ employerId: schema.jobs.employerId })
        .from(schema.jobs)
        .where(eq(schema.jobs.id, application.jobId))
        .limit(1);

      if (!job) {
        throw new NotFoundException('Associated job not found');
      }

      // Get employer profile
      const [employer] = await this.db
        .select()
        .from(schema.employers)
        .where(eq(schema.employers.userId, user.id))
        .limit(1);

      if (!employer || employer.id !== job.employerId) {
        throw new ForbiddenException('You do not have permission to update this application');
      }

      actor = 'employer';
      if (!employerAllowedStatuses.includes(newStatus)) {
        throw new ForbiddenException(
          `Employers can only set status to: ${employerAllowedStatuses.join(', ')}`,
        );
      }
    }

    // 3. Validate status transitions (industry-standard flow)
    const ALLOWED_TRANSITIONS: Record<string, Record<string, string[]>> = {
      applied: {
        candidate: ['withdrawn'],
        employer: ['viewed', 'rejected'],
      },
      viewed: {
        employer: ['shortlisted', 'rejected'],
      },
      shortlisted: {
        employer: ['interview_scheduled', 'rejected'],
      },
      interview_scheduled: {
        employer: ['hired', 'rejected'],
      },
      hired: {
        candidate: ['offer_accepted', 'offer_rejected'],
      },
      withdrawn: {
        candidate: ['applied'],
      },
    };

    const TERMINAL_STATES = ['rejected', 'offer_accepted', 'offer_rejected'];

    const currentStatus = application.status;

    // Block updates to terminal states
    if (TERMINAL_STATES.includes(currentStatus)) {
      throw new ForbiddenException('This application is already finalized and cannot be changed.');
    }

    // Validate transition exists
    const allowedForCurrentStatus = ALLOWED_TRANSITIONS[currentStatus];
    if (!allowedForCurrentStatus) {
      throw new ForbiddenException(`No transitions allowed from status: ${currentStatus}`);
    }

    const allowedForActor = allowedForCurrentStatus[actor];
    if (!allowedForActor || !allowedForActor.includes(newStatus)) {
      // Provide context-specific error messages
      if (actor === 'candidate' && ['offer_accepted', 'offer_rejected'].includes(newStatus)) {
        throw new ForbiddenException(
          'You can accept or reject an offer only after the employer marks you as hired.',
        );
      }
      if (actor === 'employer' && currentStatus === 'withdrawn') {
        throw new ForbiddenException(
          'Employers cannot update applications withdrawn by candidates.',
        );
      }
      throw new ForbiddenException(
        `Invalid status change. You cannot move the application from '${currentStatus}' to '${newStatus}'.`,
      );
    }

    // 4. Build status history entry
    const historyEntry = {
      status: newStatus,
      by: actor,
      at: new Date().toISOString(),
    };

    // 5. Update application status and append to status_history
    const [updatedApplication] = await this.db
      .update(schema.jobApplications)
      .set({
        status: updateStatusDto.status,
        notes: updateStatusDto.notes !== undefined ? updateStatusDto.notes : application.notes,
        statusHistory: sql`${schema.jobApplications.statusHistory} || ${JSON.stringify(historyEntry)}::jsonb`,
        updatedAt: new Date(),
      })
      .where(eq(schema.jobApplications.id, applicationId))
      .returning();

    // 6. Create history record (maintain existing audit trail)
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
