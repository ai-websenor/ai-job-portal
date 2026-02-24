/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SqsService, SnsService, SesService } from '@ai-job-portal/aws';
import { Database, users, profiles, jobs, employers, companies } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { PushService } from '../push/push.service';
import { eq } from 'drizzle-orm';

@Injectable()
export class QueueProcessor {
  private readonly logger = new Logger(QueueProcessor.name);
  private readonly queueUrl: string;

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly sqsService: SqsService,
    private readonly snsService: SnsService,
    private readonly sesService: SesService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
    private readonly pushService: PushService,
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
      case 'EMPLOYER_INTERVIEW_SCHEDULED':
        await this.handleEmployerInterviewScheduled(message.payload);
        break;
      case 'INTERVIEW_RESCHEDULED':
        await this.handleInterviewRescheduled(message.payload);
        break;
      case 'EMPLOYER_INTERVIEW_RESCHEDULED':
        await this.handleEmployerInterviewRescheduled(message.payload);
        break;
      case 'INTERVIEW_CANCELLED':
        await this.handleInterviewCancelled(message.payload);
        break;
      case 'EMPLOYER_INTERVIEW_CANCELLED':
        await this.handleEmployerInterviewCancelled(message.payload);
        break;
      case 'WELCOME_EMAIL':
        await this.handleWelcomeEmail(message.payload);
        break;
      case 'VERIFICATION_EMAIL':
        await this.handleVerificationEmail(message.payload);
        break;
      case 'PASSWORD_CHANGED':
        await this.handlePasswordChanged(message.payload);
        break;
      case 'APPLICATION_RECEIVED_CANDIDATE':
        await this.handleApplicationReceivedCandidate(message.payload);
        break;
      case 'APPLICATION_WITHDRAWN':
        await this.handleApplicationWithdrawn(message.payload);
        break;
      case 'OFFER_EXTENDED':
        await this.handleOfferExtended(message.payload);
        break;
      case 'OFFER_ACCEPTED':
        await this.handleOfferAccepted(message.payload);
        break;
      case 'OFFER_DECLINED':
        await this.handleOfferDeclined(message.payload);
        break;
      case 'OFFER_WITHDRAWN':
        await this.handleOfferWithdrawn(message.payload);
        break;
      case 'NEW_MESSAGE':
        await this.handleNewMessage(message.payload);
        break;
      case 'JOB_POSTED':
        await this.handleJobPosted(message.payload);
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

    // Create in-app notification + FCM push
    await this.notificationService.create({
      userId: payload.employerId,
      type: 'application_update',
      channel: 'push',
      title: 'New Application',
      message: `${payload.candidateName} applied for ${payload.jobTitle}`,
      metadata: { applicationId: payload.applicationId },
    });
    await this.pushService.sendToUser(
      payload.employerId,
      'New Application',
      `${payload.candidateName} applied for ${payload.jobTitle}`,
      { type: 'NEW_APPLICATION', applicationId: payload.applicationId },
    );

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

    // Create in-app notification + FCM push
    await this.notificationService.create({
      userId: payload.userId,
      type: 'application_update',
      channel: 'push',
      title: 'Application Update',
      message: `Your application for ${payload.jobTitle} status: ${payload.status}`,
      metadata: { applicationId: payload.applicationId },
    });
    await this.pushService.sendToUser(
      payload.userId,
      'Application Update',
      `Your application for ${payload.jobTitle} status: ${payload.status}`,
      { type: 'APPLICATION_STATUS_CHANGED', applicationId: payload.applicationId },
    );

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

    // Create in-app notification + FCM push
    await this.notificationService.create({
      userId: payload.userId,
      type: 'interview',
      channel: 'push',
      title: 'Interview Scheduled',
      message: `${payload.type} interview for ${payload.jobTitle} on ${scheduledDate.toLocaleString()}`,
      metadata: { interviewId: payload.interviewId },
    });
    await this.pushService.sendToUser(
      payload.userId,
      'Interview Scheduled',
      `${payload.type} interview for ${payload.jobTitle} on ${scheduledDate.toLocaleString()}`,
      { type: 'INTERVIEW_SCHEDULED', interviewId: payload.interviewId },
    );

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

  private async handleEmployerInterviewScheduled(payload: {
    employerId: string;
    employerEmail: string;
    interviewId: string;
    jobTitle: string;
    companyName: string;
    candidateName: string;
    candidateEmail: string;
    scheduledAt: string;
    duration: number;
    type: string;
    interviewMode?: string;
    interviewTool?: string;
    meetingLink?: string;
    meetingPassword?: string;
    hostJoinUrl?: string;
    location?: string;
    timezone?: string;
  }) {
    // Get employer details
    const employer = await this.db.query.users.findFirst({
      where: eq(users.id, payload.employerId),
    });

    if (!employer) {
      this.logger.warn(`Employer not found: ${payload.employerId}`);
      return;
    }

    const scheduledDate = new Date(payload.scheduledAt);

    // Create in-app notification + FCM push
    await this.notificationService.create({
      userId: payload.employerId,
      type: 'interview',
      channel: 'push',
      title: 'Interview Scheduled',
      message: `Interview scheduled with ${payload.candidateName} for ${payload.jobTitle}`,
      metadata: {
        interviewId: payload.interviewId,
        candidateEmail: payload.candidateEmail,
      },
    });
    await this.pushService.sendToUser(
      payload.employerId,
      'Interview Scheduled',
      `Interview scheduled with ${payload.candidateName} for ${payload.jobTitle}`,
      { type: 'EMPLOYER_INTERVIEW_SCHEDULED', interviewId: payload.interviewId },
    );

    // Send email notification
    try {
      await this.emailService.sendInterviewScheduledEmployerEmail(
        payload.employerId,
        payload.employerEmail,
        employer.firstName || 'Hiring Manager',
        payload.candidateName,
        payload.candidateEmail,
        payload.jobTitle,
        payload.companyName,
        scheduledDate,
        payload.duration,
        payload.type,
        payload.meetingLink,
        payload.meetingPassword,
        payload.interviewTool,
        payload.hostJoinUrl,
        payload.timezone || 'Asia/Kolkata',
      );

      this.logger.log(`Employer interview notification sent to ${payload.employerEmail}`);
    } catch (error: any) {
      this.logger.error(`Failed to send employer interview notification: ${error.message}`);
    }
  }

  private async handleInterviewRescheduled(payload: {
    userId: string;
    interviewId: string;
    jobTitle: string;
    companyName: string;
    oldScheduledAt: string;
    newScheduledAt: string;
    duration: number;
    type: string;
    meetingLink?: string;
    meetingPassword?: string;
    interviewTool?: string;
    reason?: string;
  }) {
    // Get candidate details
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });

    if (!user) {
      this.logger.warn(`User not found: ${payload.userId}`);
      return;
    }

    const oldDate = new Date(payload.oldScheduledAt);
    const newDate = new Date(payload.newScheduledAt);

    // Create in-app notification + FCM push
    await this.notificationService.create({
      userId: payload.userId,
      type: 'interview',
      channel: 'push',
      title: 'Interview Rescheduled',
      message: `Your interview for ${payload.jobTitle} has been rescheduled to ${newDate.toLocaleString()}`,
      metadata: {
        interviewId: payload.interviewId,
        oldScheduledAt: payload.oldScheduledAt,
        newScheduledAt: payload.newScheduledAt,
      },
    });
    await this.pushService.sendToUser(
      payload.userId,
      'Interview Rescheduled',
      `Your interview for ${payload.jobTitle} has been rescheduled to ${newDate.toLocaleString()}`,
      { type: 'INTERVIEW_RESCHEDULED', interviewId: payload.interviewId },
    );

    // Send email notification
    try {
      await this.emailService.sendInterviewRescheduledEmail(
        payload.userId,
        user.email,
        user.firstName || 'Candidate',
        payload.jobTitle,
        payload.companyName,
        oldDate,
        newDate,
        payload.duration,
        payload.meetingLink,
        payload.meetingPassword,
        payload.interviewTool,
        payload.reason,
      );

      // Send SMS for important schedule changes
      if (user.mobile && user.isMobileVerified) {
        await this.snsService.sendSms(
          user.mobile,
          `Interview Rescheduled: ${payload.jobTitle} interview moved to ${newDate.toLocaleString()}. Check email for details.`,
        );
      }

      this.logger.log(`Reschedule notification sent to ${user.email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send reschedule notification: ${error.message}`);
    }
  }

  private async handleEmployerInterviewRescheduled(payload: {
    employerId: string;
    employerEmail: string;
    interviewId: string;
    jobTitle: string;
    candidateName: string;
    oldScheduledAt: string;
    newScheduledAt: string;
    duration: number;
    type: string;
    meetingLink?: string;
    hostJoinUrl?: string;
    meetingPassword?: string;
    interviewTool?: string;
    reason?: string;
  }) {
    // Get employer details
    const employer = await this.db.query.users.findFirst({
      where: eq(users.id, payload.employerId),
    });

    if (!employer) {
      this.logger.warn(`Employer not found: ${payload.employerId}`);
      return;
    }

    const oldDate = new Date(payload.oldScheduledAt);
    const newDate = new Date(payload.newScheduledAt);

    // Create in-app notification + FCM push
    await this.notificationService.create({
      userId: payload.employerId,
      type: 'interview',
      channel: 'push',
      title: 'Interview Rescheduled',
      message: `Interview with ${payload.candidateName} for ${payload.jobTitle} rescheduled to ${newDate.toLocaleString()}`,
      metadata: {
        interviewId: payload.interviewId,
        oldScheduledAt: payload.oldScheduledAt,
        newScheduledAt: payload.newScheduledAt,
      },
    });
    await this.pushService.sendToUser(
      payload.employerId,
      'Interview Rescheduled',
      `Interview with ${payload.candidateName} for ${payload.jobTitle} rescheduled`,
      { type: 'EMPLOYER_INTERVIEW_RESCHEDULED', interviewId: payload.interviewId },
    );

    // Send email notification
    try {
      await this.emailService.sendInterviewRescheduledEmployerEmail(
        payload.employerId,
        payload.employerEmail,
        employer.firstName || 'Hiring Manager',
        payload.candidateName,
        payload.jobTitle,
        oldDate,
        newDate,
        payload.duration,
        payload.meetingLink,
        payload.hostJoinUrl,
        payload.meetingPassword,
        payload.interviewTool,
        payload.reason,
      );

      this.logger.log(`Employer reschedule notification sent to ${payload.employerEmail}`);
    } catch (error: any) {
      this.logger.error(`Failed to send employer reschedule notification: ${error.message}`);
    }
  }

  private async handleInterviewCancelled(payload: {
    userId: string;
    interviewId: string;
    jobTitle: string;
    companyName: string;
    scheduledAt: string;
    type: string;
    reason?: string;
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

    // Create in-app notification + FCM push
    await this.notificationService.create({
      userId: payload.userId,
      type: 'interview',
      channel: 'push',
      title: 'Interview Cancelled',
      message: `Your interview for ${payload.jobTitle} at ${payload.companyName} has been cancelled`,
      metadata: {
        interviewId: payload.interviewId,
        scheduledAt: payload.scheduledAt,
        reason: payload.reason,
      },
    });
    await this.pushService.sendToUser(
      payload.userId,
      'Interview Cancelled',
      `Your interview for ${payload.jobTitle} at ${payload.companyName} has been cancelled`,
      { type: 'INTERVIEW_CANCELLED', interviewId: payload.interviewId },
    );

    // Send email notification
    try {
      await this.emailService.sendInterviewCancelledEmail(
        payload.userId,
        user.email,
        user.firstName || 'Candidate',
        payload.jobTitle,
        payload.companyName,
        scheduledDate,
        payload.reason,
      );

      // Send SMS for cancellation (critical notification)
      if (user.mobile && user.isMobileVerified) {
        await this.snsService.sendSms(
          user.mobile,
          `Interview Cancelled: Your interview for ${payload.jobTitle} has been cancelled. Check email for details.`,
        );
      }

      this.logger.log(`Cancellation notification sent to ${user.email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send cancellation notification: ${error.message}`);
    }
  }

  private async handleEmployerInterviewCancelled(payload: {
    employerId: string;
    employerEmail: string;
    interviewId: string;
    jobTitle: string;
    candidateName: string;
    scheduledAt: string;
    type: string;
    reason?: string;
  }) {
    // Get employer details
    const employer = await this.db.query.users.findFirst({
      where: eq(users.id, payload.employerId),
    });

    if (!employer) {
      this.logger.warn(`Employer not found: ${payload.employerId}`);
      return;
    }

    const scheduledDate = new Date(payload.scheduledAt);

    // Create in-app notification + FCM push
    await this.notificationService.create({
      userId: payload.employerId,
      type: 'interview',
      channel: 'push',
      title: 'Interview Cancelled',
      message: `Interview with ${payload.candidateName} for ${payload.jobTitle} has been cancelled`,
      metadata: {
        interviewId: payload.interviewId,
        scheduledAt: payload.scheduledAt,
        reason: payload.reason,
      },
    });
    await this.pushService.sendToUser(
      payload.employerId,
      'Interview Cancelled',
      `Interview with ${payload.candidateName} for ${payload.jobTitle} has been cancelled`,
      { type: 'EMPLOYER_INTERVIEW_CANCELLED', interviewId: payload.interviewId },
    );

    // Send email notification
    try {
      await this.emailService.sendInterviewCancelledEmployerEmail(
        payload.employerId,
        payload.employerEmail,
        employer.firstName || 'Hiring Manager',
        payload.candidateName,
        payload.jobTitle,
        scheduledDate,
        payload.reason,
      );

      this.logger.log(`Employer cancellation notification sent to ${payload.employerEmail}`);
    } catch (error: any) {
      this.logger.error(`Failed to send employer cancellation notification: ${error.message}`);
    }
  }

  private async handleWelcomeEmail(payload: {
    userId: string;
    email: string;
    firstName: string;
    role: string;
  }) {
    await this.notificationService.create({
      userId: payload.userId,
      type: 'system',
      channel: 'push',
      title: 'Welcome to AI Job Portal',
      message: `Welcome ${payload.firstName}! Your account has been created.`,
    });
    await this.pushService.sendToUser(
      payload.userId,
      'Welcome to AI Job Portal',
      `Welcome ${payload.firstName}! Your account has been created.`,
      { type: 'WELCOME' },
    );

    try {
      await this.sesService.sendWelcomeEmail(payload.email, payload.firstName);
      this.logger.log(`Welcome email sent to ${payload.email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send welcome email: ${error.message}`);
    }
  }

  private async handleVerificationEmail(payload: { userId: string; email: string; otp: string }) {
    try {
      await this.sesService.sendVerificationEmail(payload.email, payload.otp);
      this.logger.log(`Verification email sent to ${payload.email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send verification email: ${error.message}`);
    }
  }

  private async handlePasswordChanged(payload: {
    userId: string;
    email: string;
    firstName: string;
  }) {
    await this.notificationService.create({
      userId: payload.userId,
      type: 'system',
      channel: 'push',
      title: 'Password Changed',
      message: 'Your password has been changed successfully.',
    });
    await this.pushService.sendToUser(
      payload.userId,
      'Password Changed',
      "Your password has been changed successfully. If this wasn't you, please secure your account.",
      { type: 'PASSWORD_CHANGED' },
    );

    try {
      await this.sesService.sendPasswordChangedEmail(payload.email, payload.firstName);
      this.logger.log(`Password changed email sent to ${payload.email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send password changed email: ${error.message}`);
    }
  }

  private async handleApplicationReceivedCandidate(payload: {
    userId: string;
    email: string;
    candidateName: string;
    applicationId: string;
    jobTitle: string;
    companyName: string;
  }) {
    await this.notificationService.create({
      userId: payload.userId,
      type: 'application_update',
      channel: 'push',
      title: 'Application Submitted',
      message: `Your application for ${payload.jobTitle} at ${payload.companyName} has been received.`,
      metadata: { applicationId: payload.applicationId },
    });
    await this.pushService.sendToUser(
      payload.userId,
      'Application Submitted',
      `Your application for ${payload.jobTitle} at ${payload.companyName} has been received.`,
      { type: 'APPLICATION_RECEIVED', applicationId: payload.applicationId },
    );

    try {
      await this.sesService.sendApplicationReceivedEmail(
        payload.email,
        payload.candidateName,
        payload.jobTitle,
        payload.companyName,
      );
      this.logger.log(`Application confirmation email sent to ${payload.email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send application confirmation: ${error.message}`);
    }
  }

  private async handleApplicationWithdrawn(payload: {
    employerId: string;
    applicationId: string;
    jobTitle: string;
    candidateName: string;
  }) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, payload.employerId),
    });
    if (!user) return;

    await this.notificationService.create({
      userId: payload.employerId,
      type: 'application_update',
      channel: 'push',
      title: 'Application Withdrawn',
      message: `${payload.candidateName} has withdrawn their application for ${payload.jobTitle}`,
      metadata: { applicationId: payload.applicationId },
    });
    await this.pushService.sendToUser(
      payload.employerId,
      'Application Withdrawn',
      `${payload.candidateName} has withdrawn their application for ${payload.jobTitle}`,
      { type: 'APPLICATION_WITHDRAWN', applicationId: payload.applicationId },
    );

    try {
      await this.emailService.sendEmail(
        payload.employerId,
        user.email,
        `Application Withdrawn - ${payload.jobTitle}`,
        `
          <h2>Application Withdrawn</h2>
          <p>Hi ${user.firstName},</p>
          <p><strong>${payload.candidateName}</strong> has withdrawn their application for <strong>${payload.jobTitle}</strong>.</p>
          <p>Best regards,<br>AI Job Portal Team</p>
        `,
      );
      this.logger.log(`Withdrawal notification sent to ${user.email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send withdrawal notification: ${error.message}`);
    }
  }

  private async handleOfferExtended(payload: {
    userId: string;
    applicationId: string;
    jobTitle: string;
    companyName: string;
    salary?: string;
    joiningDate?: string;
  }) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });
    if (!user) return;

    await this.notificationService.create({
      userId: payload.userId,
      type: 'application_update',
      channel: 'push',
      title: 'Job Offer Received!',
      message: `Congratulations! You have received an offer for ${payload.jobTitle} at ${payload.companyName}`,
      metadata: { applicationId: payload.applicationId },
    });
    await this.pushService.sendToUser(
      payload.userId,
      'Job Offer Received!',
      `Congratulations! You have received an offer for ${payload.jobTitle} at ${payload.companyName}`,
      { type: 'OFFER_EXTENDED', applicationId: payload.applicationId },
    );

    try {
      await this.sesService.sendOfferExtendedEmail(
        user.email,
        user.firstName,
        payload.jobTitle,
        payload.companyName,
        payload.salary,
        payload.joiningDate,
      );

      if (user.mobile && user.isMobileVerified) {
        await this.snsService.sendSms(
          user.mobile,
          `Congratulations! You have a job offer for ${payload.jobTitle} at ${payload.companyName}. Check your email for details.`,
        );
      }

      this.logger.log(`Offer extended notifications sent to ${user.email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send offer extended notification: ${error.message}`);
    }
  }

  private async handleOfferAccepted(payload: {
    employerId: string;
    applicationId: string;
    jobTitle: string;
    candidateName: string;
  }) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, payload.employerId),
    });
    if (!user) return;

    await this.notificationService.create({
      userId: payload.employerId,
      type: 'application_update',
      channel: 'push',
      title: 'Offer Accepted',
      message: `${payload.candidateName} has accepted the offer for ${payload.jobTitle}`,
      metadata: { applicationId: payload.applicationId },
    });
    await this.pushService.sendToUser(
      payload.employerId,
      'Offer Accepted',
      `${payload.candidateName} has accepted the offer for ${payload.jobTitle}`,
      { type: 'OFFER_ACCEPTED', applicationId: payload.applicationId },
    );

    try {
      await this.sesService.sendOfferAcceptedEmail(
        user.email,
        user.firstName,
        payload.candidateName,
        payload.jobTitle,
      );
      this.logger.log(`Offer accepted notification sent to ${user.email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send offer accepted notification: ${error.message}`);
    }
  }

  private async handleOfferDeclined(payload: {
    employerId: string;
    applicationId: string;
    jobTitle: string;
    candidateName: string;
    reason?: string;
  }) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, payload.employerId),
    });
    if (!user) return;

    await this.notificationService.create({
      userId: payload.employerId,
      type: 'application_update',
      channel: 'push',
      title: 'Offer Declined',
      message: `${payload.candidateName} has declined the offer for ${payload.jobTitle}`,
      metadata: { applicationId: payload.applicationId },
    });
    await this.pushService.sendToUser(
      payload.employerId,
      'Offer Declined',
      `${payload.candidateName} has declined the offer for ${payload.jobTitle}`,
      { type: 'OFFER_DECLINED', applicationId: payload.applicationId },
    );

    try {
      await this.sesService.sendOfferDeclinedEmail(
        user.email,
        user.firstName,
        payload.candidateName,
        payload.jobTitle,
        payload.reason,
      );
      this.logger.log(`Offer declined notification sent to ${user.email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send offer declined notification: ${error.message}`);
    }
  }

  private async handleOfferWithdrawn(payload: {
    userId: string;
    applicationId: string;
    jobTitle: string;
    companyName: string;
  }) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });
    if (!user) return;

    await this.notificationService.create({
      userId: payload.userId,
      type: 'application_update',
      channel: 'push',
      title: 'Offer Withdrawn',
      message: `The offer for ${payload.jobTitle} at ${payload.companyName} has been withdrawn`,
      metadata: { applicationId: payload.applicationId },
    });
    await this.pushService.sendToUser(
      payload.userId,
      'Offer Withdrawn',
      `The offer for ${payload.jobTitle} at ${payload.companyName} has been withdrawn`,
      { type: 'OFFER_WITHDRAWN', applicationId: payload.applicationId },
    );

    try {
      await this.sesService.sendOfferWithdrawnEmail(
        user.email,
        user.firstName,
        payload.jobTitle,
        payload.companyName,
      );
      this.logger.log(`Offer withdrawn notification sent to ${user.email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send offer withdrawn notification: ${error.message}`);
    }
  }

  private async handleNewMessage(payload: {
    recipientId: string;
    senderId: string;
    senderName: string;
    threadId: string;
    messagePreview: string;
  }) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, payload.recipientId),
    });
    if (!user) return;

    // In-app notification + push only (no email for chat messages)
    await this.notificationService.create({
      userId: payload.recipientId,
      type: 'message',
      channel: 'push',
      title: 'New Message',
      message: `${payload.senderName}: ${payload.messagePreview}`,
      metadata: { threadId: payload.threadId, senderId: payload.senderId },
    });
    await this.pushService.sendToUser(
      payload.recipientId,
      'New Message',
      `${payload.senderName}: ${payload.messagePreview}`,
      { type: 'NEW_MESSAGE', threadId: payload.threadId },
    );

    this.logger.log(`New message push notification sent to ${user.email}`);
  }

  private async handleJobPosted(payload: { employerId: string; jobId: string; jobTitle: string }) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, payload.employerId),
    });
    if (!user) return;

    await this.notificationService.create({
      userId: payload.employerId,
      type: 'system',
      channel: 'push',
      title: 'Job Posted',
      message: `Your job listing "${payload.jobTitle}" is now live`,
      metadata: { jobId: payload.jobId },
    });
    await this.pushService.sendToUser(
      payload.employerId,
      'Job Posted',
      `Your job listing "${payload.jobTitle}" is now live`,
      { type: 'JOB_POSTED', jobId: payload.jobId },
    );

    try {
      await this.sesService.sendJobPostedEmail(user.email, user.firstName, payload.jobTitle);
      this.logger.log(`Job posted confirmation sent to ${user.email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send job posted email: ${error.message}`);
    }
  }
}
