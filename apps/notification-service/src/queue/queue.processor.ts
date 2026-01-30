/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SqsService, SnsService } from '@ai-job-portal/aws';
import { Database, users, profiles, jobs, employers, companies } from '@ai-job-portal/database';
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
    private readonly snsService: SnsService,
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
    jobId: string;
    jobTitle: string;
    candidateId: string;
    candidateName: string;
  }) {
    // Get employer details
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, payload.employerId),
    });

    if (!user) {
      this.logger.warn(`Employer not found: ${payload.employerId}`);
      return;
    }

    // Create in-app notification
    await this.notificationService.create({
      userId: payload.employerId,
      type: 'application_update',
      channel: 'push',
      title: 'New Application',
      message: `${payload.candidateName} applied for ${payload.jobTitle}`,
      metadata: { applicationId: payload.applicationId },
    });

    // Send email notification to employer
    try {
      const employer = await this.db.query.employers.findFirst({
        where: eq(employers.userId, payload.employerId),
      });

      let companyName = 'Your Company';
      if (employer?.companyId) {
        const company = await this.db.query.companies.findFirst({
          where: eq(companies.id, employer.companyId),
        });
        companyName = company?.name || 'Your Company';
      }

      await this.emailService.sendEmail(
        payload.employerId,
        user.email,
        `New Application for ${payload.jobTitle}`,
        `
          <h2>New Application Received</h2>
          <p>Hi ${user.firstName},</p>
          <p><strong>${payload.candidateName}</strong> has applied for the position of <strong>${payload.jobTitle}</strong> at ${companyName}.</p>
          <p>Log in to your dashboard to review the application.</p>
          <p>Best regards,<br>AI Job Portal Team</p>
        `,
      );

      this.logger.log(`Email sent to employer ${user.email} for new application`);
    } catch (error: any) {
      this.logger.error(`Failed to send email: ${error.message}`);
    }
  }

  private async handleStatusChange(payload: {
    userId: string;
    applicationId: string;
    jobId: string;
    jobTitle: string;
    status: string;
    companyName?: string;
  }) {
    // Get candidate details
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });

    if (!user) {
      this.logger.warn(`User not found: ${payload.userId}`);
      return;
    }

    // Create in-app notification
    await this.notificationService.create({
      userId: payload.userId,
      type: 'application_update',
      channel: 'push',
      title: 'Application Update',
      message: `Your application for ${payload.jobTitle} status: ${payload.status}`,
      metadata: { applicationId: payload.applicationId },
    });

    // Send email notification
    try {
      const statusMessages: Record<string, string> = {
        reviewing: 'is being reviewed by the hiring team',
        shortlisted: 'has been shortlisted! The employer is interested in your profile',
        interview_scheduled: 'has moved to the interview stage',
        offer_extended: 'has resulted in a job offer! Congratulations',
        rejected: 'was not selected for this position',
        withdrawn: 'has been withdrawn as requested',
      };

      const statusMessage =
        statusMessages[payload.status] || `has been updated to: ${payload.status}`;

      await this.emailService.sendEmail(
        payload.userId,
        user.email,
        `Application Update: ${payload.jobTitle}`,
        `
          <h2>Application Status Update</h2>
          <p>Hi ${user.firstName},</p>
          <p>Your application for <strong>${payload.jobTitle}</strong> at ${payload.companyName || 'the company'} ${statusMessage}.</p>
          <p>Log in to your dashboard to view more details.</p>
          <p>Best regards,<br>AI Job Portal Team</p>
        `,
      );

      // Send SMS for important status changes
      if (['shortlisted', 'interview_scheduled', 'offer_extended'].includes(payload.status)) {
        if (user.mobile && user.isMobileVerified) {
          await this.snsService.sendApplicationStatusUpdate(
            user.mobile,
            payload.jobTitle,
            payload.status,
          );
        }
      }

      this.logger.log(`Notifications sent to ${user.email} for status change`);
    } catch (error: any) {
      this.logger.error(`Failed to send notifications: ${error.message}`);
    }
  }

  private async handleInterviewScheduled(payload: {
    userId: string;
    interviewId: string;
    jobId: string;
    jobTitle: string;
    companyName: string;
    scheduledAt: string;
    type: string;
    meetingLink?: string;
  }) {
    // Get candidate details
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });

    if (!user) {
      this.logger.warn(`User not found: ${payload.userId}`);
      return;
    }

    const scheduledDate = new Date(payload.scheduledAt);

    // Create in-app notification
    await this.notificationService.create({
      userId: payload.userId,
      type: 'interview',
      channel: 'push',
      title: 'Interview Scheduled',
      message: `${payload.type} interview for ${payload.jobTitle} on ${scheduledDate.toLocaleString()}`,
      metadata: { interviewId: payload.interviewId },
    });

    // Send email notification
    try {
      await this.emailService.sendInterviewScheduledEmail(
        payload.userId,
        user.email,
        user.firstName,
        payload.jobTitle,
        payload.companyName,
        scheduledDate,
        payload.meetingLink,
      );

      // Send SMS reminder
      if (user.mobile && user.isMobileVerified) {
        await this.snsService.sendInterviewReminder(
          user.mobile,
          payload.jobTitle,
          payload.companyName,
          scheduledDate,
        );
      }

      this.logger.log(`Interview notifications sent to ${user.email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send interview notifications: ${error.message}`);
    }
  }
}
