/**
 * Application tracking — event taxonomy.
 *
 * `application_history` is the single source of truth for the tracking timeline.
 * Every row carries a stable `eventType` from this list; the read layer maps it
 * to a short, user-friendly title. Adding a new tracked event later = add one
 * entry here + the matching TITLES line — that's the whole "scalable for later".
 */
export const APPLICATION_EVENT_TYPES = {
  APPLICATION_SUBMITTED: 'application_submitted',
  APPLICATION_VIEWED: 'application_viewed',
  SHORTLISTED: 'shortlisted',
  INTERVIEW_SCHEDULED: 'interview_scheduled',
  INTERVIEW_RESCHEDULED: 'interview_rescheduled',
  INTERVIEW_CANCELLED: 'interview_cancelled',
  INTERVIEW_ROUND_COMPLETED: 'interview_round_completed',
  INTERVIEW_IN_PROGRESS: 'interview_in_progress',
  INTERVIEW_COMPLETED: 'interview_completed',
  OFFER_MADE: 'offer_made',
  OFFER_ACCEPTED: 'offer_accepted',
  OFFER_REJECTED: 'offer_rejected',
  HIRED: 'hired',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
} as const;

export type ApplicationEventType =
  (typeof APPLICATION_EVENT_TYPES)[keyof typeof APPLICATION_EVENT_TYPES];

/** Short, user-friendly titles shown as the timeline heading. */
export const APPLICATION_EVENT_TITLES: Record<string, string> = {
  application_submitted: 'Application submitted',
  application_viewed: 'Application viewed',
  shortlisted: 'Shortlisted',
  interview_scheduled: 'Interview scheduled',
  interview_rescheduled: 'Interview rescheduled',
  interview_cancelled: 'Interview cancelled',
  interview_round_completed: 'Interview round completed',
  interview_in_progress: 'Interview in progress',
  interview_completed: 'Interview completed',
  offer_made: 'Offer made',
  offer_accepted: 'Offer accepted',
  offer_rejected: 'Offer declined',
  hired: 'Hired',
  rejected: 'Not selected',
  withdrawn: 'Application withdrawn',
};

/**
 * Derive an event type from an application status. Used as a fallback when a
 * history row has no explicit `eventType` (legacy rows / generic status writes).
 */
export function eventTypeFromStatus(status: string | null | undefined): string {
  if (!status) return 'status_changed';
  const map: Record<string, string> = {
    applied: APPLICATION_EVENT_TYPES.APPLICATION_SUBMITTED,
    viewed: APPLICATION_EVENT_TYPES.APPLICATION_VIEWED,
    shortlisted: APPLICATION_EVENT_TYPES.SHORTLISTED,
    interview_scheduled: APPLICATION_EVENT_TYPES.INTERVIEW_SCHEDULED,
    interview_rescheduled: APPLICATION_EVENT_TYPES.INTERVIEW_RESCHEDULED,
    interview_cancelled: APPLICATION_EVENT_TYPES.INTERVIEW_CANCELLED,
    interview_in_progress: APPLICATION_EVENT_TYPES.INTERVIEW_IN_PROGRESS,
    interview_completed: APPLICATION_EVENT_TYPES.INTERVIEW_COMPLETED,
    offered: APPLICATION_EVENT_TYPES.OFFER_MADE,
    offer_accepted: APPLICATION_EVENT_TYPES.OFFER_ACCEPTED,
    offer_rejected: APPLICATION_EVENT_TYPES.OFFER_REJECTED,
    hired: APPLICATION_EVENT_TYPES.HIRED,
    rejected: APPLICATION_EVENT_TYPES.REJECTED,
    withdrawn: APPLICATION_EVENT_TYPES.WITHDRAWN,
  };
  return map[status] ?? 'status_changed';
}

export function titleForEvent(eventType: string | null | undefined, status?: string): string {
  const key = eventType && eventType !== 'status_changed' ? eventType : eventTypeFromStatus(status);
  return APPLICATION_EVENT_TITLES[key] ?? 'Application updated';
}
