import { Injectable, Inject, Logger } from '@nestjs/common';
import { and, eq, gte, lte, or, inArray } from 'drizzle-orm';
import {
  Database,
  interviews,
  jobApplications,
  jobs,
  employers,
  userPreferences,
} from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { SubscriptionHelper } from '../subscription/subscription.helper';
import { AlertDto, AlertListResponseDto } from './dto';

const DEFAULT_TIMEZONE = 'Asia/Kolkata';
const LOW_CREDIT_THRESHOLD = 2; // alert when remaining <= 2
const JOB_EXPIRY_WINDOW_DAYS = 2; // alert when deadline within 2 days

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly subscriptionHelper: SubscriptionHelper,
  ) {}

  /**
   * Interview-related alerts for the authenticated user.
   *
   * - candidate: today's interviews
   * - employer/super_employer: today's interviews across their jobs
   *
   * When `limit` is a positive number the response is the top-N (severity-ranked) alerts;
   * omit it (or pass <= 0) to get the full list for the "view all" screen. `count` is always
   * the total number of available alerts, regardless of the slice.
   */
  async getInterviewAlerts(
    userId: string,
    role: string,
    limit?: number,
  ): Promise<AlertListResponseDto> {
    const isEmployer = role === 'employer' || role === 'super_employer';
    const timezone = await this.getUserTimezone(userId);

    const alerts = await this.buildInterviewTodayAlerts(userId, isEmployer, timezone);

    return this.rankAndSlice(alerts, limit);
  }

  /**
   * Subscription / account-health alerts for an employer: low subscription credits and
   * jobs expiring soon. Employer-only — candidates always receive an empty list.
   *
   * When `limit` is a positive number the response is the top-N (severity-ranked) alerts;
   * omit it (or pass <= 0) to get the full list for the "view all" screen. `count` is always
   * the total number of available alerts, regardless of the slice.
   */
  async getSubscriptionAlerts(
    userId: string,
    role: string,
    limit?: number,
  ): Promise<AlertListResponseDto> {
    const isEmployer = role === 'employer' || role === 'super_employer';
    if (!isEmployer) return { alerts: [], count: 0 };

    const alerts: AlertDto[] = [];
    alerts.push(...(await this.buildLowCreditAlerts(userId)));
    alerts.push(...(await this.buildJobExpiringAlerts(userId)));

    return this.rankAndSlice(alerts, limit);
  }

  /**
   * Sorts by severity (critical -> warning -> info), then returns the top `limit` alerts when
   * `limit` is a positive number. `count` is always the pre-slice total so the frontend can
   * decide whether to render a "view all" affordance.
   */
  private rankAndSlice(alerts: AlertDto[], limit?: number): AlertListResponseDto {
    const severityRank = { critical: 0, warning: 1, info: 2 } as const;
    alerts.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

    const total = alerts.length;
    const sliced = typeof limit === 'number' && limit > 0 ? alerts.slice(0, limit) : alerts;

    return { alerts: sliced, count: total };
  }

  // ---------------------------------------------------------------------------
  // Alert builders
  // ---------------------------------------------------------------------------

  private async buildInterviewTodayAlerts(
    userId: string,
    isEmployer: boolean,
    timezone: string,
  ): Promise<AlertDto[]> {
    const { end } = this.getTodayBoundsUtc(timezone);
    // Lower bound is "now", not the start of today, so interviews that already
    // passed earlier today (e.g. 3:00 PM when it's 4:00 PM) are excluded.
    const now = new Date();

    // Resolve the application ids in scope for this user
    let applicationIds: string[];
    if (isEmployer) {
      const employer = await this.db.query.employers.findFirst({
        where: eq(employers.userId, userId),
        columns: { id: true },
      });
      if (!employer) return [];

      const rows = await this.db
        .select({ id: jobApplications.id })
        .from(jobApplications)
        .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
        .where(eq(jobs.employerId, employer.id));
      applicationIds = rows.map((r) => r.id);
    } else {
      const rows = await this.db
        .select({ id: jobApplications.id })
        .from(jobApplications)
        .where(eq(jobApplications.jobSeekerId, userId));
      applicationIds = rows.map((r) => r.id);
    }

    if (applicationIds.length === 0) return [];

    const todays = await this.db.query.interviews.findMany({
      where: and(
        gte(interviews.scheduledAt, now),
        lte(interviews.scheduledAt, end),
        or(
          eq(interviews.status, 'scheduled'),
          eq(interviews.status, 'rescheduled'),
          eq(interviews.status, 'confirmed'),
        ),
        inArray(interviews.applicationId, applicationIds),
      ),
      with: {
        application: {
          with: {
            job: true,
            jobSeeker: { with: { profile: true } },
          },
        },
      },
      orderBy: [interviews.scheduledAt],
    });

    return todays.map((interview) => {
      const job = interview.application?.job;
      const time = this.formatTime(interview.scheduledAt, interview.timezone || timezone);
      const jobTitle = job?.title || 'a role';

      let message: string;
      if (isEmployer) {
        const profile = interview.application?.jobSeeker?.profile;
        const candidateName =
          [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() || 'a candidate';
        message = `${candidateName} for ${jobTitle}`;
      } else {
        message = `Interview for ${jobTitle}`;
      }

      return {
        id: `interview_today-${interview.id}`,
        type: 'interview_today',
        severity: 'info',
        title: `Interview today at ${time}`,
        message,
        actionUrl: `/interviews/${interview.id}`,
        actionLabel: 'View interview',
        meta: {
          interviewId: interview.id,
          applicationId: interview.applicationId,
          scheduledAt: interview.scheduledAt,
          interviewMode: interview.interviewMode,
          status: interview.status,
        },
      };
    });
  }

  private async buildLowCreditAlerts(userId: string): Promise<AlertDto[]> {
    const employerId = await this.subscriptionHelper.resolveEmployerId(userId);
    if (!employerId) return [];

    const subscription = await this.subscriptionHelper.getActiveSubscription(employerId);
    if (!subscription) return [];

    const credits: Array<{ key: string; label: string; limit: number | null; used: number }> = [
      {
        key: 'job_post',
        label: 'job posting',
        limit: subscription.jobPostingLimit,
        used: subscription.jobPostingUsed ?? 0,
      },
      {
        key: 'resume_access',
        label: 'resume access',
        limit: subscription.resumeAccessLimit,
        used: subscription.resumeAccessUsed ?? 0,
      },
      {
        key: 'featured_job',
        label: 'featured job',
        limit: subscription.featuredJobsLimit,
        used: subscription.featuredJobsUsed ?? 0,
      },
    ];

    const alerts: AlertDto[] = [];
    for (const credit of credits) {
      // Skip unlimited (null) plans; only alert on finite, low remaining credits
      if (credit.limit === null || credit.limit === undefined) continue;
      const remaining = Math.max(credit.limit - credit.used, 0);
      if (remaining > LOW_CREDIT_THRESHOLD) continue;

      const isExhausted = remaining === 0;
      alerts.push({
        id: `low_credits-${credit.key}`,
        type: 'low_credits',
        severity: isExhausted ? 'critical' : 'warning',
        title: isExhausted
          ? `No ${credit.label} credits left`
          : `Only ${remaining} ${credit.label} credit${remaining === 1 ? '' : 's'} left`,
        message: 'Upgrade your plan to keep going without interruptions.',
        actionUrl: '/employer/subscription',
        actionLabel: 'Upgrade plan',
        meta: {
          credit: credit.key,
          remaining,
          limit: credit.limit,
          used: credit.used,
        },
      });
    }

    return alerts;
  }

  private async buildJobExpiringAlerts(userId: string): Promise<AlertDto[]> {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
      columns: { id: true },
    });
    if (!employer) return [];

    const now = new Date();
    const windowEnd = new Date(now.getTime() + JOB_EXPIRY_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const expiring = await this.db.query.jobs.findMany({
      where: and(
        eq(jobs.employerId, employer.id),
        eq(jobs.status, 'active'),
        gte(jobs.deadline, now),
        lte(jobs.deadline, windowEnd),
      ),
      columns: { id: true, title: true, deadline: true },
      orderBy: [jobs.deadline],
    });

    return expiring.map((job) => {
      const daysLeft = job.deadline
        ? Math.max(Math.ceil((new Date(job.deadline).getTime() - now.getTime()) / 86_400_000), 0)
        : 0;
      const whenText = daysLeft <= 1 ? 'today' : `in ${daysLeft} days`;

      return {
        id: `job_expiring-${job.id}`,
        type: 'job_expiring',
        severity: 'warning',
        title: `"${job.title}" expires ${whenText}`,
        message: 'Extend the deadline to keep receiving applications.',
        actionUrl: `/employer/jobs/${job.id}`,
        actionLabel: 'Manage job',
        meta: {
          jobId: job.id,
          deadline: job.deadline,
          daysLeft,
        },
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async getUserTimezone(userId: string): Promise<string> {
    const prefs = await this.db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
      columns: { timezone: true },
    });
    return prefs?.timezone || DEFAULT_TIMEZONE;
  }

  /** Start (00:00:00.000) and end (23:59:59.999) of "today" in the given timezone, as UTC dates. */
  private getTodayBoundsUtc(timezone: string): { start: Date; end: Date } {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .formatToParts(now)
      .reduce<Record<string, string>>((acc, p) => {
        if (p.type !== 'literal') acc[p.type] = p.value;
        return acc;
      }, {});

    const year = Number(parts.year);
    const month = Number(parts.month);
    const day = Number(parts.day);
    const hour = Number(parts.hour) % 24;
    const minute = Number(parts.minute);
    const second = Number(parts.second);

    // Offset between the timezone and UTC at this instant
    const zonedAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    const offset = zonedAsUtc - now.getTime();

    const localMidnightAsUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
    const start = new Date(localMidnightAsUtc - offset);
    const end = new Date(localMidnightAsUtc - offset + 24 * 60 * 60 * 1000 - 1);

    return { start, end };
  }

  private formatTime(date: Date | string, timezone: string): string {
    return new Date(date).toLocaleString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
}
