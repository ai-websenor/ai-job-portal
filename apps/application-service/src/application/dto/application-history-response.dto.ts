import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Swagger response shapes for GET /applications/:id/history.
 * Documentation-only — the timeline is assembled in the service.
 */
export class TimelineInterviewDto {
  @ApiProperty({ example: 'a1b2c3d4-0000-1111-2222-333344445555' })
  id!: string;

  @ApiPropertyOptional({ example: 1, description: 'System round sequence (oldest-first)' })
  roundNumber?: number | null;

  @ApiPropertyOptional({ example: 'round 2', description: 'Employer-given round label' })
  roundName?: string | null;

  @ApiPropertyOptional({ example: 'other' })
  interviewType?: string | null;

  @ApiPropertyOptional({ example: 'writing test' })
  customType?: string | null;

  @ApiPropertyOptional({ example: 'online', enum: ['online', 'on_site', 'phone'] })
  interviewMode?: string | null;

  @ApiPropertyOptional({ example: 'zoom' })
  interviewTool?: string | null;

  @ApiPropertyOptional({ example: '2026-06-16T05:08:00.000Z' })
  scheduledAt?: string | null;

  @ApiPropertyOptional({ example: 15, description: 'Minutes' })
  duration?: number | null;

  @ApiPropertyOptional({ example: '' })
  location?: string | null;

  @ApiPropertyOptional({ example: 'https://us05web.zoom.us/j/85171874451' })
  meetingLink?: string | null;

  @ApiPropertyOptional({
    example: 'completed',
    enum: [
      'scheduled',
      'confirmed',
      'in_progress',
      'completed',
      'rescheduled',
      'canceled',
      'no_show',
    ],
  })
  status?: string | null;

  @ApiPropertyOptional({ example: 4, description: '1-5 interviewer rating' })
  rating?: number | null;

  @ApiPropertyOptional({ example: null, description: 'Reschedule / cancel reason' })
  reason?: string | null;

  @ApiPropertyOptional({ example: 'Great writing test', description: 'Interviewer notes' })
  notes?: string | null;
}

export const TIMELINE_EVENT_TYPES = [
  'application_submitted',
  'application_viewed',
  'shortlisted',
  'interview_scheduled',
  'interview_rescheduled',
  'interview_cancelled',
  'interview_round_completed',
  'interview_in_progress',
  'interview_completed',
  'offer_made',
  'offer_accepted',
  'offer_rejected',
  'hired',
  'rejected',
  'withdrawn',
] as const;

export class TimelineEntryDto {
  @ApiProperty({
    example: 'a1b2c3d4-0000-1111-2222-333344445555',
    description: 'History row id (synthetic "applied-<applicationId>" for the first entry)',
  })
  id!: string;

  @ApiProperty({
    example: 'interview_completed',
    enum: TIMELINE_EVENT_TYPES,
    description: 'Stable machine event category',
  })
  type!: string;

  @ApiProperty({ example: 'Interview completed', description: 'Short, user-friendly heading' })
  title!: string;

  @ApiPropertyOptional({
    example: 'Great writing test',
    nullable: true,
    description: 'Short subtext: reason / notes / milestone line',
  })
  description?: string | null;

  @ApiProperty({ example: 'interview_completed', description: 'Application status at this event' })
  status!: string;

  @ApiProperty({ example: '2026-06-16T05:14:08.810Z' })
  timestamp!: string;

  @ApiPropertyOptional({
    type: TimelineInterviewDto,
    nullable: true,
    description: 'Present only for interview-related events',
  })
  interview?: TimelineInterviewDto | null;
}

export class ApplicationHistoryDataDto {
  @ApiProperty({ example: '517902ae-b58d-4de2-94ff-006d017fc3bd' })
  applicationId!: string;

  @ApiProperty({ example: 'e3d1bcbe-e142-41f0-9875-24d7fd5c2b7b', nullable: true })
  jobId!: string | null;

  @ApiProperty({ example: 'Content Writing', nullable: true })
  jobTitle!: string | null;

  @ApiProperty({ example: 'interview_completed' })
  currentStatus!: string;

  @ApiProperty({ example: '2026-06-16T04:57:36.110Z' })
  appliedAt!: string;

  @ApiProperty({ type: [TimelineEntryDto], description: 'Most recent first' })
  timeline!: TimelineEntryDto[];
}

export class ApplicationHistoryResponseDto {
  @ApiProperty({ type: ApplicationHistoryDataDto })
  data!: ApplicationHistoryDataDto;

  @ApiProperty({ example: 'Application history fetched successfully' })
  message!: string;

  @ApiProperty({ example: 'success' })
  status!: string;

  @ApiProperty({ example: 200 })
  statusCode!: number;
}
