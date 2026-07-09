import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { Database, jobApplications, applicationHistory, employers } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { hasCompanyPermission } from '@ai-job-portal/common';
import {
  APPLICATION_EVENT_TYPES,
  eventTypeFromStatus,
  titleForEvent,
} from './application-history.constants';

@Injectable()
export class ApplicationHistoryService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async getApplicationHistory(userId: string, applicationId: string) {
    // Verify application belongs to this candidate
    const application = (await this.db.query.jobApplications.findFirst({
      where: and(eq(jobApplications.id, applicationId), eq(jobApplications.jobSeekerId, userId)),
      with: {
        job: true,
        interviews: {
          orderBy: (i, { asc }) => [asc(i.createdAt)],
        },
      },
    })) as any;

    if (!application) throw new NotFoundException('Application not found');

    // Short, friendly fallback descriptions for non-interview milestones,
    // phrased from the candidate's perspective.
    const milestoneDescriptions: Record<string, string> = {
      applied: 'Application submitted successfully',
      viewed: 'Employer viewed your application',
      shortlisted: 'You were shortlisted for this role',
      hired: 'Congratulations — you have been hired',
      rejected: 'Not selected for this role',
      withdrawn: 'You withdrew this application',
      offer_accepted: 'You accepted the offer',
      offer_rejected: 'You declined the offer',
    };

    const timeline = await this.assembleApplicationTimeline(application, milestoneDescriptions);

    return {
      message: 'Application history fetched successfully',
      data: {
        applicationId: application.id,
        jobId: application.jobId,
        jobTitle: application.job?.title || null,
        currentStatus: application.status,
        appliedAt: application.appliedAt,
        timeline,
      },
    };
  }

  /**
   * Get application tracking history/timeline for an employer.
   * Mirrors getApplicationHistory but scopes access to the employer who owns the
   * job (or a same-company member with company-applications:read) and uses
   * employer-facing milestone wording.
   */
  async getEmployerApplicationHistory(userId: string, applicationId: string, userRole?: string) {
    // Step 1: Find employer record for this user
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    // Step 2: Load application with job + interviews (interviews drive round numbers)
    const application = (await this.db.query.jobApplications.findFirst({
      where: eq(jobApplications.id, applicationId),
      with: {
        job: true,
        interviews: {
          orderBy: (i, { asc }) => [asc(i.createdAt)],
        },
      },
    })) as any;

    if (!application) throw new NotFoundException('Application not found');

    // Step 3: Verify the job belongs to this employer's company
    // Primary: employer directly owns the job
    // Secondary: same company AND has company-applications:read permission
    const jobCompanyId = application.job?.companyId;
    const isDirectOwner = application.job?.employerId === employer.id;
    const isSameCompany = employer.companyId && jobCompanyId && jobCompanyId === employer.companyId;

    if (!isDirectOwner) {
      if (!isSameCompany) {
        throw new ForbiddenException('Access denied');
      }
      const hasAccess = await hasCompanyPermission(
        this.db,
        employer.rbacRoleId,
        userRole || '',
        'company-applications:read',
      );
      if (!hasAccess) {
        throw new ForbiddenException('Access denied');
      }
    }

    // Milestone descriptions phrased from the employer's perspective.
    const milestoneDescriptions: Record<string, string> = {
      applied: 'Candidate submitted the application',
      viewed: 'You viewed this application',
      shortlisted: 'Candidate was shortlisted',
      hired: 'Candidate was hired',
      rejected: 'Candidate was not selected',
      withdrawn: 'Candidate withdrew the application',
      offer_accepted: 'Candidate accepted the offer',
      offer_rejected: 'Candidate declined the offer',
    };

    const timeline = await this.assembleApplicationTimeline(application, milestoneDescriptions);

    return {
      message: 'Application history fetched successfully',
      data: {
        applicationId: application.id,
        jobId: application.jobId,
        jobTitle: application.job?.title || null,
        currentStatus: application.status,
        appliedAt: application.appliedAt,
        timeline,
      },
    };
  }

  /**
   * Build the application event timeline from the application_history log.
   *
   * Single source of truth: the application_history event log. Each row is one
   * timeline entry, joined to its own interview (no fuzzy time-matching, no
   * duplication). The interviews list on `application` is only used to derive
   * round numbers. `milestoneDescriptions` lets callers tailor wording per
   * audience (candidate vs employer). Returns entries most-recent-first.
   */
  private async assembleApplicationTimeline(
    application: any,
    milestoneDescriptions: Record<string, string>,
  ): Promise<any[]> {
    const history = (await this.db.query.applicationHistory.findMany({
      where: eq(applicationHistory.applicationId, application.id),
      orderBy: (h, { asc }) => [asc(h.createdAt)],
      with: { interview: true },
    })) as any[];

    // interview id -> sequential round number (oldest-first), matching
    // getRoundsByApplication / interview details ordering.
    const roundNumberById = new Map<string, number>();
    (application.interviews || []).forEach((i: any, idx: number) => {
      roundNumberById.set(i.id, idx + 1);
    });

    const buildInterview = (row: any, meta: any) => {
      const iv = row.interview;
      if (!iv) return null;
      return {
        id: iv.id,
        roundNumber: roundNumberById.get(iv.id) ?? null,
        roundName: iv.roundName ?? null,
        interviewType: iv.interviewType ?? null,
        customType: iv.customType ?? null,
        interviewMode: iv.interviewMode ?? null,
        interviewTool: iv.interviewTool ?? null,
        scheduledAt: iv.scheduledAt ?? null,
        duration: iv.duration ?? null,
        location: iv.location ?? null,
        meetingLink: iv.meetingLink ?? null,
        status: iv.status ?? null,
        rating: meta.rating ?? iv.rating ?? null,
        reason: meta.reason ?? null,
        notes: meta.notes ?? null,
      };
    };

    const timeline: any[] = [];

    // Synthetic first entry — the "applied" milestone is not stored in history.
    timeline.push({
      id: `applied-${application.id}`,
      type: APPLICATION_EVENT_TYPES.APPLICATION_SUBMITTED,
      title: titleForEvent(APPLICATION_EVENT_TYPES.APPLICATION_SUBMITTED),
      description: milestoneDescriptions.applied,
      status: 'applied',
      timestamp: application.appliedAt,
      interview: null,
    });

    for (const h of history) {
      const type = h.eventType || eventTypeFromStatus(h.newStatus);
      const meta = h.metadata || {};
      const interview = buildInterview(h, meta);
      const reasonOrNotes = meta.reason || meta.notes || null;

      // Interview entries stay clean (title + chips + reason); non-interview
      // milestones use a short friendly line, falling back to the stored comment.
      const description = interview
        ? reasonOrNotes
        : reasonOrNotes || milestoneDescriptions[h.newStatus] || h.comment || null;

      timeline.push({
        id: h.id,
        type,
        title: titleForEvent(type, h.newStatus),
        description,
        status: h.newStatus,
        timestamp: h.createdAt,
        interview,
      });
    }

    // Most recent first
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return timeline;
  }
}
