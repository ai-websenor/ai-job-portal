import { Injectable, Inject } from '@nestjs/common';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { Database, applicationHistory } from '@ai-job-portal/database';
import { S3Service } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import { APPLICATION_EVENT_TYPES } from '../application/application-history.constants';

@Injectable()
export class InterviewEnrichmentHelper {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly s3Service: S3Service,
  ) {}

  emptyUpcoming(page: number) {
    return {
      data: [],
      pagination: { totalInterviews: 0, pageCount: 0, currentPage: page, hasNextPage: false },
    };
  }

  /**
   * Shared enrichment for a single interview row (with relations loaded).
   * Generates signed S3 URLs for candidate photo + company logo and flattens
   * job/candidate/company fields. `jobMap` optionally overrides the job title
   * (used by the employer list to reuse already-fetched titles).
   */
  async enrichInterviewRow(interview: any, jobMap?: Map<string, string>) {
    const app = interview.application as any;
    const profile = app?.jobSeeker?.profile;
    const job = app?.job;
    const company = job?.employer?.company;

    const profilePhotoUrl = await this.s3Service.getSignedDownloadUrlFromKeyOrUrl(
      profile?.profilePhoto || null,
    );
    const companyLogoUrl = await this.s3Service.getSignedDownloadUrlFromKeyOrUrl(
      company?.logoUrl || null,
    );

    return {
      id: interview.id,
      applicationId: interview.applicationId,
      // Overall application status (interview_in_progress / interview_completed /
      // ...) so the UI can show the whole-process status alongside the round status.
      applicationStatus: app?.status ?? null,
      jobId: job?.id || null,
      jobTitle: jobMap?.get(job?.id) || job?.title || null,
      candidateId: app?.jobSeekerId || null,
      candidateName: profile
        ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || null
        : null,
      candidateProfilePhoto: profilePhotoUrl,
      companyName: company?.name || null,
      companyLogo: companyLogoUrl,
      interviewType: interview.interviewType,
      customType: interview.customType ?? null,
      roundName: interview.roundName ?? null,
      interviewMode: interview.interviewMode,
      interviewTool: interview.interviewTool,
      scheduledAt: interview.scheduledAt,
      duration: interview.duration,
      location: interview.location,
      meetingLink: interview.meetingLink,
      // Host (employer) join URL. Attendee link is `meetingLink`. The client
      // picks the right one by role; never surface hostJoinUrl as the candidate
      // join link.
      hostJoinUrl: interview.hostJoinUrl ?? null,
      status: interview.status,
      interviewerNotes: interview.interviewerNotes,
      rating: interview.rating ?? null,
      candidateFeedback: interview.candidateFeedback,
      feedback: interview.feedback,
      rescheduledAt: interview.rescheduledAt,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt,
    };
  }

  /**
   * Per-round reason map sourced from application_history (the interviews table
   * has no reason column). Returns, keyed by interviewId, the LATEST reschedule
   * reason and the cancel reason for each round of an application. Completion
   * notes are not here — they live on interviews.interviewerNotes.
   */
  async getRoundReasonsMap(applicationId: string) {
    const rows = await this.db
      .select({
        interviewId: applicationHistory.interviewId,
        eventType: applicationHistory.eventType,
        metadata: applicationHistory.metadata,
        createdAt: applicationHistory.createdAt,
      })
      .from(applicationHistory)
      .where(
        and(
          eq(applicationHistory.applicationId, applicationId),
          inArray(applicationHistory.eventType, [
            APPLICATION_EVENT_TYPES.INTERVIEW_RESCHEDULED,
            APPLICATION_EVENT_TYPES.INTERVIEW_CANCELLED,
          ]),
        ),
      )
      // Newest first so the first hit per (interviewId, type) is the latest.
      .orderBy(desc(applicationHistory.createdAt));

    const map = new Map<string, { rescheduleReason: string | null; cancelReason: string | null }>();
    for (const row of rows) {
      if (!row.interviewId) continue;
      const reason = (row.metadata as any)?.reason ?? null;
      if (!reason) continue;
      const entry = map.get(row.interviewId) || { rescheduleReason: null, cancelReason: null };
      if (
        row.eventType === APPLICATION_EVENT_TYPES.INTERVIEW_RESCHEDULED &&
        !entry.rescheduleReason
      ) {
        entry.rescheduleReason = reason;
      }
      if (row.eventType === APPLICATION_EVENT_TYPES.INTERVIEW_CANCELLED && !entry.cancelReason) {
        entry.cancelReason = reason;
      }
      map.set(row.interviewId, entry);
    }
    return map;
  }
}
