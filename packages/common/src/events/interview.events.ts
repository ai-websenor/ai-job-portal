export enum InterviewEvent {
  INTERVIEW_SCHEDULED = 'interview.scheduled',
  INTERVIEW_RESCHEDULED = 'interview.rescheduled',
  INTERVIEW_CANCELLED = 'interview.cancelled',
}

export interface InterviewEventPayload {
  interviewId: string;
  applicationId: string;
  jobId: string;
  candidateId: string;
  employerId: string;
  scheduledAt: string; // ISO Date string
  meetingType: string;
  meetingTool?: string;
  meetingLink?: string;
  timezone?: string;
}
