import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsArray,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

/**
 * Interview Type Options:
 * - phone: Phone screening interview
 * - video: General video interview
 * - in_person: Face-to-face interview at office
 * - technical: Technical/coding interview
 * - hr: HR round interview
 * - panel: Panel interview with multiple interviewers
 * - assessment: Skills assessment or test
 */
const INTERVIEW_TYPES = [
  'phone',
  'video',
  'in_person',
  'technical',
  'hr',
  'panel',
  'assessment',
] as const;

/**
 * Interview Mode Options:
 * - online: Virtual interview (video call)
 * - offline: In-person interview at physical location
 */
const INTERVIEW_MODES = ['online', 'offline'] as const;

/**
 * Interview Tool Options (for online interviews):
 * - zoom: Auto-generates Zoom meeting link
 * - teams: Auto-generates Microsoft Teams meeting link
 * - phone: Phone call (no video)
 * - other: Manual meeting link required
 */
const INTERVIEW_TOOLS = ['zoom', 'teams', 'phone', 'other'] as const;

export class ScheduleInterviewDto {
  @ApiProperty({
    description: 'UUID of the job application to schedule interview for',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID()
  applicationId: string;

  @ApiProperty({
    enum: INTERVIEW_TYPES,
    description: `Type of interview round. Options:
    - phone: Phone screening
    - video: Video interview
    - in_person: Face-to-face at office
    - technical: Technical/coding round
    - hr: HR discussion
    - panel: Multiple interviewers
    - assessment: Skills test`,
    example: 'technical',
  })
  @IsEnum(INTERVIEW_TYPES)
  type: (typeof INTERVIEW_TYPES)[number];

  @ApiPropertyOptional({
    enum: INTERVIEW_MODES,
    default: 'online',
    description: `Interview mode:
    - online: Virtual interview via video call
    - offline: In-person at physical location`,
    example: 'online',
  })
  @IsOptional()
  @IsEnum(INTERVIEW_MODES)
  interviewMode?: (typeof INTERVIEW_MODES)[number];

  @ApiPropertyOptional({
    enum: INTERVIEW_TOOLS,
    description: `Video conferencing tool (required for online interviews):
    - zoom: Auto-generates Zoom meeting link
    - teams: Auto-generates Microsoft Teams meeting link
    - phone: Phone call only
    - other: Provide your own meeting link in 'meetingLink' field`,
    example: 'zoom',
  })
  @IsOptional()
  @IsEnum(INTERVIEW_TOOLS)
  interviewTool?: (typeof INTERVIEW_TOOLS)[number];

  @ApiProperty({
    description: 'Scheduled date and time in ISO 8601 format. Must be a future date.',
    example: '2026-02-15T10:30:00.000Z',
    format: 'date-time',
    type: 'string',
  })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({
    default: 60,
    description: 'Interview duration in minutes',
    example: 60,
    minimum: 15,
    maximum: 480,
  })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({
    description:
      'Physical address for offline/in-person interviews. Required when interviewMode is "offline".',
    example: 'TechCorp Office, 5th Floor, Cyber Tower, Hitech City, Hyderabad - 500081',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description:
      'Manual meeting link. Required only when interviewTool is "other". For zoom/teams, link is auto-generated.',
    example: 'https://meet.google.com/abc-defg-hij',
  })
  @IsOptional()
  @IsString()
  meetingLink?: string;

  @ApiPropertyOptional({
    description: 'Timezone for the interview. Defaults to Asia/Kolkata if not specified.',
    example: 'Asia/Kolkata',
    default: 'Asia/Kolkata',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'List of interviewer user IDs (UUIDs)',
    example: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  interviewerIds?: string[];
}

export class UpdateInterviewDto extends PartialType(ScheduleInterviewDto) {
  @ApiPropertyOptional({
    enum: ['scheduled', 'confirmed', 'rescheduled'],
    description: `Interview status:
    - scheduled: Initial state after scheduling
    - confirmed: Candidate confirmed attendance
    - rescheduled: Interview time was changed`,
    example: 'confirmed',
  })
  @IsOptional()
  @IsEnum(['scheduled', 'confirmed', 'rescheduled'])
  status?: string;
}

export class InterviewResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440099' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  applicationId: string;

  @ApiProperty({ enum: INTERVIEW_TYPES, example: 'technical' })
  interviewType: string;

  @ApiPropertyOptional({ enum: INTERVIEW_MODES, example: 'online' })
  interviewMode?: string;

  @ApiPropertyOptional({ enum: INTERVIEW_TOOLS, example: 'zoom' })
  interviewTool?: string;

  @ApiProperty({ example: '2026-02-15T10:30:00.000Z' })
  scheduledAt: Date;

  @ApiProperty({ example: 60 })
  duration: number;

  @ApiPropertyOptional({ example: 'TechCorp Office, 5th Floor' })
  location?: string;

  @ApiPropertyOptional({
    description: 'Meeting join URL for candidates',
    example: 'https://zoom.us/j/1234567890',
  })
  meetingLink?: string;

  @ApiPropertyOptional({
    description: 'Meeting password (if applicable)',
    example: 'abc123',
  })
  meetingPassword?: string;

  @ApiPropertyOptional({
    description: 'Host join URL (for interviewers)',
    example: 'https://zoom.us/s/1234567890',
  })
  hostJoinUrl?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  zoomMeetingId?: string;

  @ApiPropertyOptional({ example: 'AAMkAGI2TG93AAA=' })
  teamsMeetingId?: string;

  @ApiPropertyOptional({
    description: 'Error message if meeting creation failed',
    example: null,
  })
  meetingError?: string;

  @ApiProperty({
    enum: ['scheduled', 'confirmed', 'completed', 'rescheduled', 'canceled', 'no_show'],
    example: 'scheduled',
  })
  status: string;

  @ApiPropertyOptional({
    description: 'Timestamp when the interview was last rescheduled',
    example: '2026-02-12T10:00:00.000Z',
    nullable: true,
  })
  rescheduledAt?: Date;

  @ApiProperty({ example: '2026-02-10T08:00:00.000Z' })
  createdAt: Date;
}

/**
 * Example request bodies for Swagger documentation
 */
export const SCHEDULE_INTERVIEW_EXAMPLES = {
  onlineZoom: {
    summary: 'Online Interview with Zoom (Auto-generated link)',
    value: {
      applicationId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'technical',
      interviewMode: 'online',
      interviewTool: 'zoom',
      scheduledAt: '2026-02-15T10:30:00.000Z',
      duration: 60,
      timezone: 'Asia/Kolkata',
    },
  },
  onlineTeams: {
    summary: 'Online Interview with Microsoft Teams',
    value: {
      applicationId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'hr',
      interviewMode: 'online',
      interviewTool: 'teams',
      scheduledAt: '2026-02-16T14:00:00.000Z',
      duration: 45,
      timezone: 'Asia/Kolkata',
    },
  },
  onlineManualLink: {
    summary: 'Online Interview with custom meeting link',
    value: {
      applicationId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'panel',
      interviewMode: 'online',
      interviewTool: 'other',
      meetingLink: 'https://meet.google.com/abc-defg-hij',
      scheduledAt: '2026-02-17T11:00:00.000Z',
      duration: 90,
      timezone: 'Asia/Kolkata',
    },
  },
  offlineInPerson: {
    summary: 'Offline/In-Person Interview',
    value: {
      applicationId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'in_person',
      interviewMode: 'offline',
      location: 'TechCorp Office, 5th Floor, Cyber Tower, Hitech City, Hyderabad - 500081',
      scheduledAt: '2026-02-18T10:00:00.000Z',
      duration: 60,
      timezone: 'Asia/Kolkata',
    },
  },
  phoneScreening: {
    summary: 'Phone Screening Interview',
    value: {
      applicationId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'phone',
      interviewMode: 'online',
      interviewTool: 'phone',
      scheduledAt: '2026-02-14T09:00:00.000Z',
      duration: 30,
      timezone: 'Asia/Kolkata',
    },
  },
};
