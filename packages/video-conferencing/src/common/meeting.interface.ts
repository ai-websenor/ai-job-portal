export interface MeetingCreateRequest {
  topic: string;
  startTime: Date;
  duration: number;
  timezone?: string;
  agenda?: string;
  hostEmail?: string;
  attendeeEmails?: string[];
}

export interface MeetingUpdateRequest {
  topic?: string;
  startTime?: Date;
  duration?: number;
  timezone?: string;
  agenda?: string;
}

export interface MeetingDetails {
  provider: 'zoom' | 'teams';
  meetingId: string;
  meetingLink: string;
  password?: string;
  hostJoinUrl?: string;
  dialInNumbers?: { country: string; number: string }[];
  startTime: Date;
  duration: number;
  rawResponse?: unknown;
}

export interface MeetingProvider {
  createMeeting(request: MeetingCreateRequest): Promise<MeetingDetails>;
  updateMeeting(meetingId: string, request: MeetingUpdateRequest): Promise<MeetingDetails>;
  deleteMeeting(meetingId: string): Promise<void>;
  getMeeting(meetingId: string): Promise<MeetingDetails>;
}
