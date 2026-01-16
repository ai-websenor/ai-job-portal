import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InterviewEvent, InterviewEventPayload } from '@ai-job-portal/common';
import { NotificationLogsService } from '../notification-logs/notification-logs.service';

/**
 * Phase 2 note:
 * - Recipient is candidateId placeholder
 * - Real email/name resolution will be handled via user-service in Phase 3
 * - This consumer must remain payload-only
 */
@Controller()
export class InterviewConsumer {
  constructor(private readonly notificationLogsService: NotificationLogsService) {}

  @EventPattern(InterviewEvent.INTERVIEW_SCHEDULED)
  async handleInterviewScheduled(@Payload() data: InterviewEventPayload) {
    try {
      console.log('Received INTERVIEW_SCHEDULED event:', data);

      // Mock Email Sending Logic
      const mockEmailSubject = 'Interview Scheduled';
      const mockEmailMessage = `Your interview is scheduled for ${data.scheduledAt}. Connection: ${data.meetingLink || 'TBH'}`;

      // Log to DB
      await this.notificationLogsService.logNotification({
        userId: data.candidateId,
        notificationType: 'interview_scheduled',
        channel: 'email',
        recipient: data.candidateId, // Phase 2: candidateId placeholder
        subject: mockEmailSubject,
        message: mockEmailMessage,
        status: 'sent', // Mock success
      });
    } catch (error) {
      console.error('Error handling INTERVIEW_SCHEDULED event:', error);
    }
  }

  @EventPattern(InterviewEvent.INTERVIEW_RESCHEDULED)
  async handleInterviewRescheduled(@Payload() data: InterviewEventPayload) {
    try {
      console.log('Received INTERVIEW_RESCHEDULED event:', data);

      const mockEmailSubject = 'Interview Rescheduled';
      const mockEmailMessage = `Your interview has been rescheduled to ${data.scheduledAt}.`;

      await this.notificationLogsService.logNotification({
        userId: data.candidateId,
        notificationType: 'interview_rescheduled',
        channel: 'email',
        recipient: data.candidateId, // Phase 2: candidateId placeholder
        subject: mockEmailSubject,
        message: mockEmailMessage,
        status: 'sent',
      });
    } catch (error) {
      console.error('Error handling INTERVIEW_RESCHEDULED event:', error);
    }
  }

  @EventPattern(InterviewEvent.INTERVIEW_CANCELLED)
  async handleInterviewCancelled(@Payload() data: InterviewEventPayload) {
    try {
      console.log('Received INTERVIEW_CANCELLED event:', data);

      const mockEmailSubject = 'Interview Cancelled';
      const mockEmailMessage = `Your interview scheduled for ${data.scheduledAt} has been cancelled.`;

      await this.notificationLogsService.logNotification({
        userId: data.candidateId,
        notificationType: 'interview_cancelled',
        channel: 'email',
        recipient: data.candidateId, // Phase 2: candidateId placeholder
        subject: mockEmailSubject,
        message: mockEmailMessage,
        status: 'sent',
      });
    } catch (error) {
      console.error('Error handling INTERVIEW_CANCELLED event:', error);
    }
  }
}
