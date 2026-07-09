import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  VideoConferencingFactory,
  MeetingDetails,
  MeetingCreateRequest,
} from '@ai-job-portal/video-conferencing';
import { ScheduleInterviewDto } from './dto';

@Injectable()
export class InterviewVideoService {
  private readonly logger = new Logger(InterviewVideoService.name);

  constructor(@Optional() private readonly videoConferencingFactory?: VideoConferencingFactory) {}

  async createVideoMeeting(
    dto: ScheduleInterviewDto,
    application: any,
    scheduledAt: Date,
    timezone: string,
  ): Promise<MeetingDetails> {
    if (!this.videoConferencingFactory) {
      throw new Error('Video conferencing not configured');
    }

    const provider = this.videoConferencingFactory.getProvider(
      dto.interviewTool as 'zoom' | 'teams',
    );

    const candidateName =
      application.jobSeeker?.profile?.firstName ||
      application.jobSeeker?.email?.split('@')[0] ||
      'Candidate';

    const meetingRequest: MeetingCreateRequest = {
      topic: `Interview: ${application.job.title} - ${candidateName}`,
      startTime: scheduledAt,
      duration: dto.duration || 60,
      timezone,
      agenda: `Interview for ${application.job.title} position`,
    };

    return provider.createMeeting(meetingRequest);
  }

  async deleteVideoMeeting(interview: any): Promise<void> {
    if (!this.videoConferencingFactory) {
      return;
    }

    try {
      if (interview.zoomMeetingId) {
        const zoomService = this.videoConferencingFactory.getProvider('zoom');
        await zoomService.deleteMeeting(interview.zoomMeetingId);
        this.logger.log(`Deleted Zoom meeting: ${interview.zoomMeetingId}`);
      } else if (interview.teamsMeetingId) {
        const teamsService = this.videoConferencingFactory.getProvider('teams');
        await teamsService.deleteMeeting(interview.teamsMeetingId);
        this.logger.log(`Deleted Teams meeting: ${interview.teamsMeetingId}`);
      }
    } catch (error: any) {
      this.logger.warn(`Failed to delete video meeting: ${error.message}`);
      // Don't fail the cancel operation
    }
  }
}
