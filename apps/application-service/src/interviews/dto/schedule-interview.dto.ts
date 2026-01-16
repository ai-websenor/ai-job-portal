export class ScheduleInterviewDto {
  candidateId: string;
  jobId: string;
  scheduledAt: string; // ISO timestamp
  durationMinutes: number;
  meetingType: string; // 'online' | 'offline'
  meetingTool?: string;
  meetingLink?: string;
  location?: string;
  notes?: string;
}
