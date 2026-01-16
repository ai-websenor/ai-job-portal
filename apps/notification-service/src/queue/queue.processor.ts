import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SqsService } from '@ai-job-portal/aws';
import { Database, users, candidateProfiles, jobs } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { eq } from 'drizzle-orm';

@Injectable()
export class QueueProcessor {
  private readonly logger = new Logger(QueueProcessor.name);
  private readonly queueUrl: string;

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly sqsService: SqsService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
  ) {
    this.queueUrl = this.configService.get('SQS_NOTIFICATION_QUEUE_URL') || '';
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processQueue() {
    if (!this.queueUrl) return;

    try {
      const messages = await this.sqsService.receiveMessages(this.queueUrl, 10, 5);

      for (const message of messages) {
        const parsed = this.sqsService.parseMessage(message);
        if (!parsed) continue;

        try {
          await this.processMessage(parsed);
          await this.sqsService.deleteMessage(this.queueUrl, message.ReceiptHandle!);
        } catch (error: any) {
          this.logger.error(`Failed to process message: ${error.message}`);
        }
      }
    } catch (error: any) {
      this.logger.error(`Queue processing error: ${error.message}`);
    }
  }

  private async processMessage(message: { type: string; payload: any }) {
    switch (message.type) {
      case 'NEW_APPLICATION':
        await this.handleNewApplication(message.payload);
        break;
      case 'APPLICATION_STATUS_CHANGED':
        await this.handleStatusChange(message.payload);
        break;
      case 'INTERVIEW_SCHEDULED':
        await this.handleInterviewScheduled(message.payload);
        break;
      default:
        this.logger.warn(`Unknown message type: ${message.type}`);
    }
  }

  private async handleNewApplication(payload: {
    employerId: string;
    applicationId: string;
    jobTitle: string;
    candidateName: string;
  }) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, payload.employerId),
    });

    if (user) {
      await this.notificationService.create({
        userId: payload.employerId,
        type: 'application',
        title: 'New Application',
        message: `${payload.candidateName} applied for ${payload.jobTitle}`,
        actionUrl: `/applications/${payload.applicationId}`,
      });
    }
  }

  private async handleStatusChange(payload: {
    userId: string;
    applicationId: string;
    jobTitle: string;
    status: string;
  }) {
    await this.notificationService.create({
      userId: payload.userId,
      type: 'application',
      title: 'Application Update',
      message: `Your application for ${payload.jobTitle} status: ${payload.status}`,
      actionUrl: `/applications/${payload.applicationId}`,
    });
  }

  private async handleInterviewScheduled(payload: {
    userId: string;
    interviewId: string;
    jobTitle: string;
    scheduledAt: string;
    type: string;
  }) {
    await this.notificationService.create({
      userId: payload.userId,
      type: 'interview',
      title: 'Interview Scheduled',
      message: `${payload.type} interview for ${payload.jobTitle} on ${new Date(payload.scheduledAt).toLocaleString()}`,
      actionUrl: `/interviews/${payload.interviewId}`,
    });
  }
}
