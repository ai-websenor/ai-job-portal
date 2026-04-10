/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { CustomLogger } from '@ai-job-portal/logger';
import { SqsService, SnsService, SesService } from '@ai-job-portal/aws';
import {
  Database,
  users,
  profiles,
  jobs,
  employers,
  companies,
  invoices,
  savedSearches,
  notificationPreferencesEnhanced,
} from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { PushService } from '../push/push.service';
import { eq, and, gte, inArray } from 'drizzle-orm';

type NotificationPreferenceCategory =
  | 'jobAlerts'
  | 'applicationUpdates'
  | 'interviewReminders'
  | 'messages'
  | 'marketing';

type NotificationChannelPreferences = {
  email: boolean;
  push: boolean;
  sms: boolean;
};

const DEFAULT_NOTIFICATION_CHANNEL_PREFERENCES: Record<
  NotificationPreferenceCategory,
  NotificationChannelPreferences
> = {
  jobAlerts: { email: true, push: true, sms: false },
  applicationUpdates: { email: true, push: true, sms: false },
  interviewReminders: { email: true, push: true, sms: false },
  messages: { email: true, push: true, sms: false },
  marketing: { email: false, push: false, sms: false },
};

@Injectable()
export class QueueProcessor {
  private readonly logger = new CustomLogger();
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
    if (!this.queueUrl) {
      this.logger.error(
        'SQS_NOTIFICATION_QUEUE_URL is not configured! Queue processing is DISABLED. No notifications will be processed.',
        'QueueProcessor',
      );
    } else {
      this.logger.log(`Queue processor initialized with URL: ${this.queueUrl}`, 'QueueProcessor');
    }
  }

  private formatInterviewDateTime(date: Date, timezone = 'Asia/Kolkata') {
    return date.toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }

  private async getChannelPreferences(
    userId: string,
    category: NotificationPreferenceCategory,
  ): Promise<NotificationChannelPreferences> {
    const prefs = await this.db.query.notificationPreferencesEnhanced.findFirst({
      where: eq(notificationPreferencesEnhanced.userId, userId),
    });

    const defaults = DEFAULT_NOTIFICATION_CHANNEL_PREFERENCES[category];
    const stored =
      (prefs?.[category] as Partial<NotificationChannelPreferences> | null | undefined) ?? {};

    return {
      email: stored.email ?? defaults.email,
      push: stored.push ?? defaults.push,
      sms: stored.sms ?? defaults.sms,
    };
  }

  private logPreferenceSkip(
    userId: string,
    category: NotificationPreferenceCategory,
    channel: keyof NotificationChannelPreferences,
    context: string,
  ) {
    this.logger.log(
      `Skipping ${context} for user ${userId} because ${category}.${channel} is disabled`,
      'QueueProcessor',
    );
  }

  private async sendPushNotificationIfEnabled(
    channelPrefs: NotificationChannelPreferences,
    params: {
      userId: string;
      category: NotificationPreferenceCategory;
      notificationType: 'job_alert' | 'application_update' | 'interview' | 'message' | 'system';
      title: string;
      message: string;
      metadata?: Record<string, unknown>;
      pushTitle?: string;
      pushMessage?: string;
      pushData?: Record<string, string>;
      context: string;
    },
  ) {
    if (!channelPrefs.push) {
      this.logPreferenceSkip(params.userId, params.category, 'push', params.context);
      return false;
    }

    await this.notificationService.create({
      userId: params.userId,
      type: params.notificationType,
      channel: 'push',
      title: params.title,
      message: params.message,
      metadata: params.metadata,
    });

    await this.pushService.sendToUser(
      params.userId,
      params.pushTitle || params.title,
      params.pushMessage || params.message,
      params.pushData,
    );

    return true;
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
          this.logger.error(`Failed to process message: ${error.message}`, 'QueueProcessor');
        }
      }
    } catch (error: any) {
      this.logger.error(`Queue processing error: ${error.message}`, 'QueueProcessor');
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
      case 'PASSWORD_RESET_OTP':
        await this.handlePasswordResetOtp(message.payload);
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
      case 'ACCOUNT_APPROVED':
        await this.handleAccountApproved(message.payload);
        break;
      case 'ACCOUNT_REJECTED':
        await this.handleAccountRejected(message.payload);
        break;
      case 'ACCOUNT_SUSPENDED':
        await this.handleAccountSuspended(message.payload);
        break;
      case 'INVOICE_GENERATED':
        await this.handleInvoiceGenerated(message.payload);
        break;
      default:
        this.logger.warn(`Unknown message type: ${message.type}`, 'QueueProcessor');
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
      this.logger.warn(`Employer not found: ${payload.employerId}`, 'QueueProcessor');
      return;
    }

    const channelPrefs = await this.getChannelPreferences(payload.employerId, 'applicationUpdates');

    await this.sendPushNotificationIfEnabled(channelPrefs, {
      userId: payload.employerId,
      category: 'applicationUpdates',
      notificationType: 'application_update',
      title: 'New Application',
      message: `${payload.candidateName} applied for ${payload.jobTitle}`,
      metadata: { applicationId: payload.applicationId },
      pushData: { type: 'NEW_APPLICATION', applicationId: payload.applicationId },
      context: 'new application push notification',
    });

    // Send email notification to employer
    if (channelPrefs.email) {
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

        await this.emailService.sendNewApplicationEmployerEmail(
          payload.employerId,
          user.email,
          user.firstName,
          payload.candidateName,
          payload.jobTitle,
          companyName,
        );

        this.logger.log(
          `Email sent to employer ${user.email} for new application`,
          'QueueProcessor',
        );
      } catch (error: any) {
        this.logger.error(`Failed to send email: ${error.message}`, 'QueueProcessor');
      }
    } else {
      this.logPreferenceSkip(
        payload.employerId,
        'applicationUpdates',
        'email',
        'new application email notification',
      );
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
      this.logger.warn(`User not found: ${payload.userId}`, 'QueueProcessor');
      return;
    }

    const channelPrefs = await this.getChannelPreferences(payload.userId, 'applicationUpdates');

    await this.sendPushNotificationIfEnabled(channelPrefs, {
      userId: payload.userId,
      category: 'applicationUpdates',
      notificationType: 'application_update',
      title: 'Application Update',
      message: `Your application for ${payload.jobTitle} status: ${payload.status}`,
      metadata: { applicationId: payload.applicationId },
      pushData: {
        type: 'APPLICATION_STATUS_CHANGED',
        applicationId: payload.applicationId,
      },
      context: 'application status push notification',
    });

    // Send email notification
    try {
      if (channelPrefs.email) {
        await this.emailService.sendApplicationStatusUpdateEmail(
          payload.userId,
          user.email,
          user.firstName,
          payload.jobTitle,
          payload.companyName || 'the company',
          payload.status,
        );
      } else {
        this.logPreferenceSkip(
          payload.userId,
          'applicationUpdates',
          'email',
          'application status email notification',
        );
      }

      // Send SMS for important status changes
      if (
        channelPrefs.sms &&
        ['shortlisted', 'interview_scheduled', 'offer_extended'].includes(payload.status)
      ) {
        if (user.mobile && user.isMobileVerified) {
          await this.snsService.sendApplicationStatusUpdate(
            user.mobile,
            payload.jobTitle,
            payload.status,
          );
        }
      } else if (
        !channelPrefs.sms &&
        ['shortlisted', 'interview_scheduled', 'offer_extended'].includes(payload.status)
      ) {
        this.logPreferenceSkip(
          payload.userId,
          'applicationUpdates',
          'sms',
          'application status sms notification',
        );
      }

      this.logger.log(`Notifications sent to ${user.email} for status change`, 'QueueProcessor');
    } catch (error: any) {
      this.logger.error(`Failed to send notifications: ${error.message}`, 'QueueProcessor');
    }
  }

  private async handleInterviewScheduled(payload: {
    userId: string;
    interviewId: string;
    jobTitle: string;
    companyName: string;
    scheduledAt: string;
    duration: number;
    type: string;
    interviewTool?: string;
    meetingLink?: string;
    meetingPassword?: string;
    timezone?: string;
  }) {
    // Get candidate details
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });

    if (!user) {
      this.logger.warn(`User not found: ${payload.userId}`, 'QueueProcessor');
      return;
    }

    const scheduledDate = new Date(payload.scheduledAt);
    const formattedScheduledDate = this.formatInterviewDateTime(
      scheduledDate,
      payload.timezone || 'Asia/Kolkata',
    );

    const channelPrefs = await this.getChannelPreferences(payload.userId, 'interviewReminders');

    await this.sendPushNotificationIfEnabled(channelPrefs, {
      userId: payload.userId,
      category: 'interviewReminders',
      notificationType: 'interview',
      title: 'Interview Scheduled',
      message: `${payload.type} interview for ${payload.jobTitle} on ${formattedScheduledDate}`,
      metadata: { interviewId: payload.interviewId },
      pushData: { type: 'INTERVIEW_SCHEDULED', interviewId: payload.interviewId },
      context: 'interview scheduled push notification',
    });

    // Send email notification
    try {
      if (channelPrefs.email) {
        await this.emailService.sendInterviewScheduledEmail(
          payload.userId,
          user.email,
          user.firstName,
          payload.jobTitle,
          payload.companyName,
          scheduledDate,
          payload.duration,
          payload.type,
          payload.interviewTool,
          payload.meetingLink,
          payload.meetingPassword,
          payload.timezone || 'Asia/Kolkata',
        );
      } else {
        this.logPreferenceSkip(
          payload.userId,
          'interviewReminders',
          'email',
          'interview scheduled email notification',
        );
      }

      // Send SMS reminder
      if (channelPrefs.sms && user.mobile && user.isMobileVerified) {
        await this.snsService.sendInterviewReminder(
          user.mobile,
          payload.jobTitle,
          payload.companyName,
          scheduledDate,
          payload.timezone || 'Asia/Kolkata',
        );
      } else if (!channelPrefs.sms) {
        this.logPreferenceSkip(
          payload.userId,
          'interviewReminders',
          'sms',
          'interview scheduled sms reminder',
        );
      }

      this.logger.log(`Interview notifications sent to ${user.email}`, 'QueueProcessor');
    } catch (error: any) {
      this.logger.error(
        `Failed to send interview notifications: ${error.message}`,
        'QueueProcessor',
      );
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
      this.logger.warn(`Employer not found: ${payload.employerId}`, 'QueueProcessor');
      return;
    }

    const scheduledDate = new Date(payload.scheduledAt);

    const channelPrefs = await this.getChannelPreferences(payload.employerId, 'interviewReminders');

    await this.sendPushNotificationIfEnabled(channelPrefs, {
      userId: payload.employerId,
      category: 'interviewReminders',
      notificationType: 'interview',
      title: 'Interview Scheduled',
      message: `Interview scheduled with ${payload.candidateName} for ${payload.jobTitle}`,
      metadata: {
        interviewId: payload.interviewId,
        candidateEmail: payload.candidateEmail,
      },
      pushData: {
        type: 'EMPLOYER_INTERVIEW_SCHEDULED',
        interviewId: payload.interviewId,
      },
      context: 'employer interview scheduled push notification',
    });

    // Send email notification
    if (channelPrefs.email) {
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

        this.logger.log(
          `Employer interview notification sent to ${payload.employerEmail}`,
          'QueueProcessor',
        );
      } catch (error: any) {
        this.logger.error(
          `Failed to send employer interview notification: ${error.message}`,
          'QueueProcessor',
        );
      }
    } else {
      this.logPreferenceSkip(
        payload.employerId,
        'interviewReminders',
        'email',
        'employer interview scheduled email notification',
      );
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
    timezone?: string;
  }) {
    // Get candidate details
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });

    if (!user) {
      this.logger.warn(`User not found: ${payload.userId}`, 'QueueProcessor');
      return;
    }

    const oldDate = new Date(payload.oldScheduledAt);
    const newDate = new Date(payload.newScheduledAt);
    const formattedNewDate = this.formatInterviewDateTime(
      newDate,
      payload.timezone || 'Asia/Kolkata',
    );

    const channelPrefs = await this.getChannelPreferences(payload.userId, 'interviewReminders');

    await this.sendPushNotificationIfEnabled(channelPrefs, {
      userId: payload.userId,
      category: 'interviewReminders',
      notificationType: 'interview',
      title: 'Interview Rescheduled',
      message: `Your interview for ${payload.jobTitle} has been rescheduled to ${formattedNewDate}`,
      metadata: {
        interviewId: payload.interviewId,
        oldScheduledAt: payload.oldScheduledAt,
        newScheduledAt: payload.newScheduledAt,
      },
      pushData: { type: 'INTERVIEW_RESCHEDULED', interviewId: payload.interviewId },
      context: 'interview rescheduled push notification',
    });

    // Send email notification
    try {
      if (channelPrefs.email) {
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
          payload.timezone || 'Asia/Kolkata',
        );
      } else {
        this.logPreferenceSkip(
          payload.userId,
          'interviewReminders',
          'email',
          'interview rescheduled email notification',
        );
      }

      // Send SMS for important schedule changes
      if (channelPrefs.sms && user.mobile && user.isMobileVerified) {
        await this.snsService.sendSms(
          user.mobile,
          `Interview Rescheduled: ${payload.jobTitle} interview moved to ${formattedNewDate}. Check email for details.`,
        );
      } else if (!channelPrefs.sms) {
        this.logPreferenceSkip(
          payload.userId,
          'interviewReminders',
          'sms',
          'interview rescheduled sms notification',
        );
      }

      this.logger.log(`Reschedule notification sent to ${user.email}`, 'QueueProcessor');
    } catch (error: any) {
      this.logger.error(
        `Failed to send reschedule notification: ${error.message}`,
        'QueueProcessor',
      );
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
    timezone?: string;
  }) {
    // Get employer details
    const employer = await this.db.query.users.findFirst({
      where: eq(users.id, payload.employerId),
    });

    if (!employer) {
      this.logger.warn(`Employer not found: ${payload.employerId}`, 'QueueProcessor');
      return;
    }

    const oldDate = new Date(payload.oldScheduledAt);
    const newDate = new Date(payload.newScheduledAt);
    const formattedNewDate = this.formatInterviewDateTime(
      newDate,
      payload.timezone || 'Asia/Kolkata',
    );

    const channelPrefs = await this.getChannelPreferences(payload.employerId, 'interviewReminders');

    await this.sendPushNotificationIfEnabled(channelPrefs, {
      userId: payload.employerId,
      category: 'interviewReminders',
      notificationType: 'interview',
      title: 'Interview Rescheduled',
      message: `Interview with ${payload.candidateName} for ${payload.jobTitle} rescheduled to ${formattedNewDate}`,
      pushMessage: `Interview with ${payload.candidateName} for ${payload.jobTitle} rescheduled`,
      metadata: {
        interviewId: payload.interviewId,
        oldScheduledAt: payload.oldScheduledAt,
        newScheduledAt: payload.newScheduledAt,
      },
      pushData: {
        type: 'EMPLOYER_INTERVIEW_RESCHEDULED',
        interviewId: payload.interviewId,
      },
      context: 'employer interview rescheduled push notification',
    });

    // Send email notification
    if (channelPrefs.email) {
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
          payload.timezone || 'Asia/Kolkata',
        );

        this.logger.log(
          `Employer reschedule notification sent to ${payload.employerEmail}`,
          'QueueProcessor',
        );
      } catch (error: any) {
        this.logger.error(
          `Failed to send employer reschedule notification: ${error.message}`,
          'QueueProcessor',
        );
      }
    } else {
      this.logPreferenceSkip(
        payload.employerId,
        'interviewReminders',
        'email',
        'employer interview rescheduled email notification',
      );
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
    timezone?: string;
  }) {
    // Get candidate details
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });

    if (!user) {
      this.logger.warn(`User not found: ${payload.userId}`, 'QueueProcessor');
      return;
    }

    const scheduledDate = new Date(payload.scheduledAt);

    const channelPrefs = await this.getChannelPreferences(payload.userId, 'interviewReminders');

    await this.sendPushNotificationIfEnabled(channelPrefs, {
      userId: payload.userId,
      category: 'interviewReminders',
      notificationType: 'interview',
      title: 'Interview Cancelled',
      message: `Your interview for ${payload.jobTitle} at ${payload.companyName} has been cancelled`,
      metadata: {
        interviewId: payload.interviewId,
        scheduledAt: payload.scheduledAt,
        reason: payload.reason,
      },
      pushData: { type: 'INTERVIEW_CANCELLED', interviewId: payload.interviewId },
      context: 'interview cancelled push notification',
    });

    // Send email notification
    try {
      if (channelPrefs.email) {
        await this.emailService.sendInterviewCancelledEmail(
          payload.userId,
          user.email,
          user.firstName || 'Candidate',
          payload.jobTitle,
          payload.companyName,
          scheduledDate,
          payload.reason,
          payload.timezone || 'Asia/Kolkata',
        );
      } else {
        this.logPreferenceSkip(
          payload.userId,
          'interviewReminders',
          'email',
          'interview cancelled email notification',
        );
      }

      // Send SMS for cancellation (critical notification)
      if (channelPrefs.sms && user.mobile && user.isMobileVerified) {
        await this.snsService.sendSms(
          user.mobile,
          `Interview Cancelled: Your interview for ${payload.jobTitle} has been cancelled. Check email for details.`,
        );
      } else if (!channelPrefs.sms) {
        this.logPreferenceSkip(
          payload.userId,
          'interviewReminders',
          'sms',
          'interview cancelled sms notification',
        );
      }

      this.logger.log(`Cancellation notification sent to ${user.email}`, 'QueueProcessor');
    } catch (error: any) {
      this.logger.error(
        `Failed to send cancellation notification: ${error.message}`,
        'QueueProcessor',
      );
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
    timezone?: string;
  }) {
    // Get employer details
    const employer = await this.db.query.users.findFirst({
      where: eq(users.id, payload.employerId),
    });

    if (!employer) {
      this.logger.warn(`Employer not found: ${payload.employerId}`, 'QueueProcessor');
      return;
    }

    const scheduledDate = new Date(payload.scheduledAt);

    const channelPrefs = await this.getChannelPreferences(payload.employerId, 'interviewReminders');

    await this.sendPushNotificationIfEnabled(channelPrefs, {
      userId: payload.employerId,
      category: 'interviewReminders',
      notificationType: 'interview',
      title: 'Interview Cancelled',
      message: `Interview with ${payload.candidateName} for ${payload.jobTitle} has been cancelled`,
      metadata: {
        interviewId: payload.interviewId,
        scheduledAt: payload.scheduledAt,
        reason: payload.reason,
      },
      pushData: {
        type: 'EMPLOYER_INTERVIEW_CANCELLED',
        interviewId: payload.interviewId,
      },
      context: 'employer interview cancelled push notification',
    });

    // Send email notification
    if (channelPrefs.email) {
      try {
        await this.emailService.sendInterviewCancelledEmployerEmail(
          payload.employerId,
          payload.employerEmail,
          employer.firstName || 'Hiring Manager',
          payload.candidateName,
          payload.jobTitle,
          scheduledDate,
          payload.reason,
          payload.timezone || 'Asia/Kolkata',
        );

        this.logger.log(
          `Employer cancellation notification sent to ${payload.employerEmail}`,
          'QueueProcessor',
        );
      } catch (error: any) {
        this.logger.error(
          `Failed to send employer cancellation notification: ${error.message}`,
          'QueueProcessor',
        );
      }
    } else {
      this.logPreferenceSkip(
        payload.employerId,
        'interviewReminders',
        'email',
        'employer interview cancelled email notification',
      );
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
      await this.emailService.sendWelcomeEmail(
        payload.userId,
        payload.email,
        payload.firstName,
        payload.role,
      );
      this.logger.log(`Welcome email sent to ${payload.email}`, 'QueueProcessor');
    } catch (error: any) {
      this.logger.error(`Failed to send welcome email: ${error.message}`, 'QueueProcessor');
    }
  }

  private async handleVerificationEmail(payload: { userId: string; email: string; otp: string }) {
    try {
      await this.emailService.sendEmailVerificationOtp(payload.userId, payload.email, payload.otp);
      this.logger.log(`Verification email sent to ${payload.email}`, 'QueueProcessor');
    } catch (error: any) {
      this.logger.error(`Failed to send verification email: ${error.message}`, 'QueueProcessor');
    }
  }

  private async handlePasswordResetOtp(payload: { userId: string; email: string; otp: string }) {
    try {
      await this.emailService.sendPasswordResetOtp(payload.userId, payload.email, payload.otp);
      this.logger.log(`Password reset OTP email sent to ${payload.email}`, 'QueueProcessor');
    } catch (error: any) {
      this.logger.error(
        `Failed to send password reset OTP email: ${error.message}`,
        'QueueProcessor',
      );
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
      await this.emailService.sendPasswordChangedEmail(
        payload.userId,
        payload.email,
        payload.firstName,
      );
      this.logger.log(`Password changed email sent to ${payload.email}`, 'QueueProcessor');
    } catch (error: any) {
      this.logger.error(
        `Failed to send password changed email: ${error.message}`,
        'QueueProcessor',
      );
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
    const channelPrefs = await this.getChannelPreferences(payload.userId, 'applicationUpdates');

    await this.sendPushNotificationIfEnabled(channelPrefs, {
      userId: payload.userId,
      category: 'applicationUpdates',
      notificationType: 'application_update',
      title: 'Application Submitted',
      message: `Your application for ${payload.jobTitle} at ${payload.companyName} has been received.`,
      metadata: { applicationId: payload.applicationId },
      pushData: { type: 'APPLICATION_RECEIVED', applicationId: payload.applicationId },
      context: 'application submitted push notification',
    });

    if (channelPrefs.email) {
      try {
        await this.emailService.sendApplicationReceivedEmail(
          payload.userId,
          payload.email,
          payload.candidateName,
          payload.jobTitle,
          payload.companyName,
        );
        this.logger.log(
          `Application confirmation email sent to ${payload.email}`,
          'QueueProcessor',
        );
      } catch (error: any) {
        this.logger.error(
          `Failed to send application confirmation: ${error.message}`,
          'QueueProcessor',
        );
      }
    } else {
      this.logPreferenceSkip(
        payload.userId,
        'applicationUpdates',
        'email',
        'application submitted email notification',
      );
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

    const channelPrefs = await this.getChannelPreferences(payload.employerId, 'applicationUpdates');

    await this.sendPushNotificationIfEnabled(channelPrefs, {
      userId: payload.employerId,
      category: 'applicationUpdates',
      notificationType: 'application_update',
      title: 'Application Withdrawn',
      message: `${payload.candidateName} has withdrawn their application for ${payload.jobTitle}`,
      metadata: { applicationId: payload.applicationId },
      pushData: { type: 'APPLICATION_WITHDRAWN', applicationId: payload.applicationId },
      context: 'application withdrawn push notification',
    });

    if (channelPrefs.email) {
      try {
        await this.emailService.sendApplicationWithdrawnEmail(
          payload.employerId,
          user.email,
          user.firstName,
          payload.candidateName,
          payload.jobTitle,
        );
        this.logger.log(`Withdrawal notification sent to ${user.email}`, 'QueueProcessor');
      } catch (error: any) {
        this.logger.error(
          `Failed to send withdrawal notification: ${error.message}`,
          'QueueProcessor',
        );
      }
    } else {
      this.logPreferenceSkip(
        payload.employerId,
        'applicationUpdates',
        'email',
        'application withdrawn email notification',
      );
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

    const channelPrefs = await this.getChannelPreferences(payload.userId, 'applicationUpdates');

    await this.sendPushNotificationIfEnabled(channelPrefs, {
      userId: payload.userId,
      category: 'applicationUpdates',
      notificationType: 'application_update',
      title: 'Job Offer Received!',
      message: `Congratulations! You have received an offer for ${payload.jobTitle} at ${payload.companyName}`,
      metadata: { applicationId: payload.applicationId },
      pushData: { type: 'OFFER_EXTENDED', applicationId: payload.applicationId },
      context: 'offer extended push notification',
    });

    try {
      if (channelPrefs.email) {
        await this.emailService.sendOfferExtendedEmail(
          payload.userId,
          user.email,
          user.firstName,
          payload.jobTitle,
          payload.companyName,
          payload.salary,
          payload.joiningDate,
        );
      } else {
        this.logPreferenceSkip(
          payload.userId,
          'applicationUpdates',
          'email',
          'offer extended email notification',
        );
      }

      if (channelPrefs.sms && user.mobile && user.isMobileVerified) {
        await this.snsService.sendSms(
          user.mobile,
          `Congratulations! You have a job offer for ${payload.jobTitle} at ${payload.companyName}. Check your email for details.`,
        );
      } else if (!channelPrefs.sms) {
        this.logPreferenceSkip(
          payload.userId,
          'applicationUpdates',
          'sms',
          'offer extended sms notification',
        );
      }

      this.logger.log(`Offer extended notifications sent to ${user.email}`, 'QueueProcessor');
    } catch (error: any) {
      this.logger.error(
        `Failed to send offer extended notification: ${error.message}`,
        'QueueProcessor',
      );
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

    const channelPrefs = await this.getChannelPreferences(payload.employerId, 'applicationUpdates');

    await this.sendPushNotificationIfEnabled(channelPrefs, {
      userId: payload.employerId,
      category: 'applicationUpdates',
      notificationType: 'application_update',
      title: 'Offer Accepted',
      message: `${payload.candidateName} has accepted the offer for ${payload.jobTitle}`,
      metadata: { applicationId: payload.applicationId },
      pushData: { type: 'OFFER_ACCEPTED', applicationId: payload.applicationId },
      context: 'offer accepted push notification',
    });

    if (channelPrefs.email) {
      try {
        await this.emailService.sendOfferAcceptedEmployerEmail(
          payload.employerId,
          user.email,
          user.firstName,
          payload.candidateName,
          payload.jobTitle,
        );
        this.logger.log(`Offer accepted notification sent to ${user.email}`, 'QueueProcessor');
      } catch (error: any) {
        this.logger.error(
          `Failed to send offer accepted notification: ${error.message}`,
          'QueueProcessor',
        );
      }
    } else {
      this.logPreferenceSkip(
        payload.employerId,
        'applicationUpdates',
        'email',
        'offer accepted email notification',
      );
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

    const channelPrefs = await this.getChannelPreferences(payload.employerId, 'applicationUpdates');

    await this.sendPushNotificationIfEnabled(channelPrefs, {
      userId: payload.employerId,
      category: 'applicationUpdates',
      notificationType: 'application_update',
      title: 'Offer Declined',
      message: `${payload.candidateName} has declined the offer for ${payload.jobTitle}`,
      metadata: { applicationId: payload.applicationId },
      pushData: { type: 'OFFER_DECLINED', applicationId: payload.applicationId },
      context: 'offer declined push notification',
    });

    if (channelPrefs.email) {
      try {
        await this.emailService.sendOfferDeclinedEmployerEmail(
          payload.employerId,
          user.email,
          user.firstName,
          payload.candidateName,
          payload.jobTitle,
          payload.reason,
        );
        this.logger.log(`Offer declined notification sent to ${user.email}`, 'QueueProcessor');
      } catch (error: any) {
        this.logger.error(
          `Failed to send offer declined notification: ${error.message}`,
          'QueueProcessor',
        );
      }
    } else {
      this.logPreferenceSkip(
        payload.employerId,
        'applicationUpdates',
        'email',
        'offer declined email notification',
      );
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

    const channelPrefs = await this.getChannelPreferences(payload.userId, 'applicationUpdates');

    await this.sendPushNotificationIfEnabled(channelPrefs, {
      userId: payload.userId,
      category: 'applicationUpdates',
      notificationType: 'application_update',
      title: 'Offer Withdrawn',
      message: `The offer for ${payload.jobTitle} at ${payload.companyName} has been withdrawn`,
      metadata: { applicationId: payload.applicationId },
      pushData: { type: 'OFFER_WITHDRAWN', applicationId: payload.applicationId },
      context: 'offer withdrawn push notification',
    });

    if (channelPrefs.email) {
      try {
        await this.emailService.sendOfferWithdrawnEmail(
          payload.userId,
          user.email,
          user.firstName,
          payload.jobTitle,
          payload.companyName,
        );
        this.logger.log(`Offer withdrawn notification sent to ${user.email}`, 'QueueProcessor');
      } catch (error: any) {
        this.logger.error(
          `Failed to send offer withdrawn notification: ${error.message}`,
          'QueueProcessor',
        );
      }
    } else {
      this.logPreferenceSkip(
        payload.userId,
        'applicationUpdates',
        'email',
        'offer withdrawn email notification',
      );
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

    const channelPrefs = await this.getChannelPreferences(payload.recipientId, 'messages');

    const wasSent = await this.sendPushNotificationIfEnabled(channelPrefs, {
      userId: payload.recipientId,
      category: 'messages',
      notificationType: 'message',
      title: 'New Message',
      message: `${payload.senderName}: ${payload.messagePreview}`,
      metadata: { threadId: payload.threadId, senderId: payload.senderId },
      pushData: { type: 'NEW_MESSAGE', threadId: payload.threadId },
      context: 'new message notification',
    });

    if (wasSent) {
      this.logger.log(`New message push notification sent to ${user.email}`, 'QueueProcessor');
    }
  }

  private async handleJobPosted(payload: {
    employerId: string;
    jobId: string;
    jobTitle: string;
    companyName?: string;
    location?: string;
    city?: string;
    state?: string;
    skills?: string[];
    categoryId?: string | null;
    jobType?: string[];
    workMode?: string[] | null;
    salaryMin?: number | null;
    salaryMax?: number | null;
  }) {
    // ── 1. Notify the employer that their job is live ──────────────────
    const employer = await this.db.query.users.findFirst({
      where: eq(users.id, payload.employerId),
    });

    if (employer) {
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
        await this.emailService.sendJobPostedEmail(
          payload.employerId,
          employer.email,
          employer.firstName,
          payload.jobTitle,
        );
        this.logger.log(`Job posted confirmation sent to ${employer.email}`, 'QueueProcessor');
      } catch (error: any) {
        this.logger.error(`Failed to send job posted email: ${error.message}`, 'QueueProcessor');
      }
    }

    // ── 2. Find all active saved searches with instant alerts enabled ──
    const activeAlerts = await this.db.query.savedSearches.findMany({
      where: and(
        eq(savedSearches.alertEnabled, true),
        eq(savedSearches.isActive, true),
        eq(savedSearches.alertFrequency, 'instant'),
      ),
    });

    if (!activeAlerts.length) return;

    // ── 3. Match each saved search against the published job ───────────
    const jobUrl = `${this.configService.get('BASE_URL') || 'https://dev.d3tubn69g0t2tw.amplifyapp.com'}/jobs/${payload.jobId}`;
    const companyName = payload.companyName || 'Company';
    const location = payload.city || payload.location || '';

    for (const alert of activeAlerts) {
      try {
        if (!this.matchesSearchCriteria(alert.searchCriteria, payload)) continue;

        // Skip the employer's own saved searches
        if (alert.userId === payload.employerId) continue;

        // ── 4. Check user notification preferences ─────────────────────
        const pref = await this.db.query.notificationPreferencesEnhanced.findFirst({
          where: eq(notificationPreferencesEnhanced.userId, alert.userId),
        });

        const jobAlertPref = (pref?.jobAlerts as { email?: boolean; push?: boolean } | null) ?? {
          email: true,
          push: true,
        };

        const channels = (alert.alertChannels || 'email,push').split(',').map((c) => c.trim());

        const sendEmail = jobAlertPref.email !== false && channels.includes('email');
        const sendPush = jobAlertPref.push !== false && channels.includes('push');

        if (!sendEmail && !sendPush) continue;

        // ── 5. Fetch candidate details ─────────────────────────────────
        const candidate = await this.db.query.users.findFirst({
          where: eq(users.id, alert.userId),
        });
        if (!candidate) continue;

        const candidateName = candidate.firstName || 'there';

        // ── 6. Send notifications ──────────────────────────────────────
        await this.notificationService.create({
          userId: alert.userId,
          type: 'job_alert',
          channel: 'push',
          title: 'New Job Match',
          message: `${payload.jobTitle} at ${companyName}`,
          metadata: { jobId: payload.jobId, savedSearchId: alert.id },
        });

        if (sendPush) {
          try {
            await this.pushService.sendToUser(
              alert.userId,
              'New Job Match',
              `${payload.jobTitle} at ${companyName} — ${location}`,
              { type: 'JOB_ALERT', jobId: payload.jobId },
            );
          } catch (err: any) {
            this.logger.error(
              `Push failed for user ${alert.userId}: ${err.message}`,
              'QueueProcessor',
            );
          }
        }

        if (sendEmail) {
          try {
            await this.emailService.sendJobAlertEmail(
              alert.userId,
              candidate.email,
              candidateName,
              payload.jobTitle,
              companyName,
              location,
              jobUrl,
            );
          } catch (err: any) {
            this.logger.error(
              `Job alert email failed for user ${alert.userId}: ${err.message}`,
              'QueueProcessor',
            );
          }
        }

        // ── 7. Update alert tracking ───────────────────────────────────
        await this.db
          .update(savedSearches)
          .set({
            alertCount: (alert.alertCount ?? 0) + 1,
            lastAlertSent: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(savedSearches.id, alert.id));

        this.logger.log(
          `Job alert sent to user ${alert.userId} for job ${payload.jobId}`,
          'QueueProcessor',
        );
      } catch (err: any) {
        this.logger.error(`Failed to process alert ${alert.id}: ${err.message}`, 'QueueProcessor');
      }
    }
  }

  // ── Daily digest — runs every day at 8:00 AM ─────────────────────────────
  @Cron('0 8 * * *')
  async processDailyAlerts() {
    this.logger.log('Running daily job alert digest', 'QueueProcessor');
    await this.processDigestAlerts('daily', 24 * 60 * 60 * 1000);
  }

  // ── Weekly digest — runs every Monday at 8:00 AM ──────────────────────────
  @Cron('0 8 * * 1')
  async processWeeklyAlerts() {
    this.logger.log('Running weekly job alert digest', 'QueueProcessor');
    await this.processDigestAlerts('weekly', 7 * 24 * 60 * 60 * 1000);
  }

  /**
   * Shared digest processor for daily and weekly frequencies.
   *
   * Flow:
   * 1. Fetch all jobs published within the lookback window (24h or 7d)
   * 2. Fetch all active saved searches with the matching frequency
   * 3. For each saved search, filter jobs that match its criteria
   * 4. Skip the alert if no jobs matched or the user is the employer
   * 5. Check user notification preferences
   * 6. Send digest email (all matching jobs in one email) + push (count summary)
   * 7. Update lastAlertSent and alertCount on the saved search
   */
  private async processDigestAlerts(frequency: 'daily' | 'weekly', windowMs: number) {
    const cutoff = new Date(Date.now() - windowMs);
    const baseUrl =
      this.configService.get('BASE_URL') || 'https://dev.d3tubn69g0t2tw.amplifyapp.com';

    // ── 1. Fetch recently published jobs within the window ─────────────────
    const recentJobs = await this.db.query.jobs.findMany({
      where: and(eq(jobs.isActive, true), gte(jobs.createdAt, cutoff)),
    });

    if (!recentJobs.length) {
      this.logger.log(
        `No jobs published in the last ${frequency === 'daily' ? '24h' : '7d'} — skipping digest`,
        'QueueProcessor',
      );
      return;
    }

    // Fetch company names for all recent jobs in a single query
    const companyIds = [...new Set(recentJobs.map((j) => j.companyId).filter(Boolean) as string[])];
    const companyMap = new Map<string, string>();
    if (companyIds.length > 0) {
      const companyList = await this.db
        .select({ id: companies.id, name: companies.name })
        .from(companies)
        .where(inArray(companies.id, companyIds));
      for (const c of companyList) {
        companyMap.set(c.id, c.name);
      }
    }

    // ── 2. Fetch all active saved searches for this frequency ──────────────
    const alerts = await this.db.query.savedSearches.findMany({
      where: and(
        eq(savedSearches.alertEnabled, true),
        eq(savedSearches.isActive, true),
        eq(savedSearches.alertFrequency, frequency),
      ),
    });

    if (!alerts.length) return;

    // ── 3. Process each saved search ───────────────────────────────────────
    for (const alert of alerts) {
      try {
        // Filter recent jobs against this alert's criteria
        const matchingJobs = recentJobs.filter((job) =>
          this.matchesSearchCriteria(alert.searchCriteria, {
            jobTitle: job.title,
            location: job.location,
            city: job.city ?? undefined,
            state: job.state ?? undefined,
            categoryId: job.categoryId,
            jobType: job.jobType,
            workMode: job.workMode,
            skills: job.skills ?? undefined,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
          }),
        );

        if (!matchingJobs.length) continue;

        // ── 4. Check user notification preferences ─────────────────────────
        const pref = await this.db.query.notificationPreferencesEnhanced.findFirst({
          where: eq(notificationPreferencesEnhanced.userId, alert.userId),
        });

        const jobAlertPref = (pref?.jobAlerts as { email?: boolean; push?: boolean } | null) ?? {
          email: true,
          push: true,
        };

        const channels = (alert.alertChannels || 'email,push').split(',').map((c) => c.trim());
        const sendEmail = jobAlertPref.email !== false && channels.includes('email');
        const sendPush = jobAlertPref.push !== false && channels.includes('push');

        if (!sendEmail && !sendPush) continue;

        // ── 5. Fetch candidate details ─────────────────────────────────────
        const candidate = await this.db.query.users.findFirst({
          where: eq(users.id, alert.userId),
        });
        if (!candidate) continue;

        const candidateName = candidate.firstName || 'there';
        const label = frequency === 'daily' ? 'today' : 'this week';

        // ── 6. Build job list for digest ───────────────────────────────────
        const digestJobs = matchingJobs.slice(0, 10).map((job) => ({
          title: job.title,
          companyName: (job.companyId && companyMap.get(job.companyId)) || 'Company',
          location: job.city || job.location || '',
          url: `${baseUrl}/jobs/${job.id}`,
        }));

        // ── 7. Send in-app notification ────────────────────────────────────
        await this.notificationService.create({
          userId: alert.userId,
          type: 'job_alert',
          channel: 'push',
          title: `${matchingJobs.length} new job${matchingJobs.length > 1 ? 's' : ''} match your alert`,
          message: `"${alert.name}" — ${matchingJobs.length} new match${matchingJobs.length > 1 ? 'es' : ''} ${label}`,
          metadata: { savedSearchId: alert.id, matchCount: matchingJobs.length },
        });

        // ── 8. Send push notification ──────────────────────────────────────
        if (sendPush) {
          try {
            await this.pushService.sendToUser(
              alert.userId,
              `${matchingJobs.length} new job${matchingJobs.length > 1 ? 's' : ''} for you`,
              `"${alert.name}" — ${matchingJobs.length} new match${matchingJobs.length > 1 ? 'es' : ''} ${label}`,
              {
                type: 'JOB_ALERT_DIGEST',
                savedSearchId: alert.id,
                count: String(matchingJobs.length),
              },
            );
          } catch (err: any) {
            this.logger.error(
              `Digest push failed for user ${alert.userId}: ${err.message}`,
              'QueueProcessor',
            );
          }
        }

        // ── 9. Send digest email ───────────────────────────────────────────
        if (sendEmail) {
          try {
            await this.emailService.sendJobAlertDigestEmail(
              alert.userId,
              candidate.email,
              candidateName,
              alert.name,
              digestJobs,
              frequency,
            );
          } catch (err: any) {
            this.logger.error(
              `Digest email failed for user ${alert.userId}: ${err.message}`,
              'QueueProcessor',
            );
          }
        }

        // ── 10. Update alert tracking ──────────────────────────────────────
        await this.db
          .update(savedSearches)
          .set({
            alertCount: (alert.alertCount ?? 0) + matchingJobs.length,
            lastAlertSent: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(savedSearches.id, alert.id));

        this.logger.log(
          `Digest sent to user ${alert.userId} — ${matchingJobs.length} jobs matched (${frequency})`,
          'QueueProcessor',
        );
      } catch (err: any) {
        this.logger.error(
          `Failed to process digest alert ${alert.id}: ${err.message}`,
          'QueueProcessor',
        );
      }
    }
  }

  /**
   * Returns true when the published job satisfies the saved search criteria.
   * All criteria fields are optional — only present fields are evaluated.
   * Criteria JSON shape (all optional):
   *   keyword, location, city, state, categoryId, jobType, workMode,
   *   skills (string[]), salaryMin, salaryMax
   */
  private matchesSearchCriteria(
    searchCriteriaJson: string,
    job: {
      jobTitle: string;
      location?: string;
      city?: string;
      state?: string;
      categoryId?: string | null;
      jobType?: string[];
      workMode?: string[] | null;
      skills?: string[];
      salaryMin?: number | null;
      salaryMax?: number | null;
    },
  ): boolean {
    let criteria: Record<string, any>;
    try {
      criteria = JSON.parse(searchCriteriaJson);
    } catch {
      return false;
    }

    // keyword → job title (case-insensitive substring match)
    if (criteria.keyword) {
      const kw = criteria.keyword.toLowerCase();
      if (!job.jobTitle.toLowerCase().includes(kw)) return false;
    }

    // location / city / state
    if (criteria.location) {
      const loc = criteria.location.toLowerCase();
      const matches =
        job.location?.toLowerCase().includes(loc) ||
        job.city?.toLowerCase().includes(loc) ||
        job.state?.toLowerCase().includes(loc);
      if (!matches) return false;
    }

    if (criteria.city) {
      if (!job.city?.toLowerCase().includes(criteria.city.toLowerCase())) return false;
    }

    if (criteria.state) {
      if (!job.state?.toLowerCase().includes(criteria.state.toLowerCase())) return false;
    }

    // categoryId — exact match
    if (criteria.categoryId && job.categoryId !== criteria.categoryId) return false;

    // jobType — at least one type must overlap
    if (criteria.jobType) {
      const wantedTypes: string[] = Array.isArray(criteria.jobType)
        ? criteria.jobType
        : [criteria.jobType];
      const hasOverlap = (job.jobType || []).some((t) => wantedTypes.includes(t));
      if (!hasOverlap) return false;
    }

    // workMode — at least one mode must overlap
    if (criteria.workMode) {
      const wantedModes: string[] = Array.isArray(criteria.workMode)
        ? criteria.workMode
        : [criteria.workMode];
      const hasOverlap = (job.workMode || []).some((m) => wantedModes.includes(m));
      if (!hasOverlap) return false;
    }

    // skills — at least one skill in criteria must be present in job skills
    if (criteria.skills && Array.isArray(criteria.skills) && criteria.skills.length > 0) {
      const jobSkills = (job.skills || []).map((s) => s.toLowerCase());
      const hasSkill = criteria.skills.some((s: string) => jobSkills.includes(s.toLowerCase()));
      if (!hasSkill) return false;
    }

    // salary range — job salary range must overlap with criteria range
    if (criteria.salaryMin !== undefined && criteria.salaryMin !== null) {
      if (job.salaryMax !== null && job.salaryMax !== undefined) {
        if (job.salaryMax < Number(criteria.salaryMin)) return false;
      }
    }
    if (criteria.salaryMax !== undefined && criteria.salaryMax !== null) {
      if (job.salaryMin !== null && job.salaryMin !== undefined) {
        if (job.salaryMin > Number(criteria.salaryMax)) return false;
      }
    }

    return true;
  }

  private async handleAccountApproved(payload: {
    userId: string;
    email: string;
    firstName: string;
  }) {
    await this.notificationService.create({
      userId: payload.userId,
      type: 'system',
      channel: 'push',
      title: 'Account Approved',
      message: `Welcome ${payload.firstName}! Your account has been approved.`,
    });
    await this.pushService.sendToUser(
      payload.userId,
      'Account Approved',
      `Welcome ${payload.firstName}! Your account has been approved.`,
      { type: 'ACCOUNT_APPROVED' },
    );

    try {
      await this.emailService.sendAccountApprovedEmail(
        payload.userId,
        payload.email,
        payload.firstName,
      );
      this.logger.log(`Account approved email sent to ${payload.email}`, 'QueueProcessor');
    } catch (error: any) {
      this.logger.error(
        `Failed to send account approved email: ${error.message}`,
        'QueueProcessor',
      );
    }
  }

  private async handleAccountRejected(payload: {
    userId: string;
    email: string;
    firstName: string;
    reason?: string;
  }) {
    await this.notificationService.create({
      userId: payload.userId,
      type: 'system',
      channel: 'push',
      title: 'Account Rejected',
      message: `Your account verification was not successful.`,
    });
    await this.pushService.sendToUser(
      payload.userId,
      'Account Rejected',
      'Your account verification was not successful. Please check your email for details.',
      { type: 'ACCOUNT_REJECTED' },
    );

    try {
      await this.emailService.sendAccountRejectedEmail(
        payload.userId,
        payload.email,
        payload.firstName,
        payload.reason,
      );
      this.logger.log(`Account rejected email sent to ${payload.email}`, 'QueueProcessor');
    } catch (error: any) {
      this.logger.error(
        `Failed to send account rejected email: ${error.message}`,
        'QueueProcessor',
      );
    }
  }

  private async handleAccountSuspended(payload: {
    userId: string;
    email: string;
    firstName: string;
    reason?: string;
  }) {
    await this.notificationService.create({
      userId: payload.userId,
      type: 'system',
      channel: 'push',
      title: 'Account Suspended',
      message: 'Your account has been suspended.',
    });
    await this.pushService.sendToUser(
      payload.userId,
      'Account Suspended',
      'Your account has been suspended. Please check your email for details.',
      { type: 'ACCOUNT_SUSPENDED' },
    );

    try {
      await this.emailService.sendAccountSuspendedEmail(
        payload.userId,
        payload.email,
        payload.firstName,
        payload.reason,
      );
      this.logger.log(`Account suspended email sent to ${payload.email}`, 'QueueProcessor');
    } catch (error: any) {
      this.logger.error(
        `Failed to send account suspended email: ${error.message}`,
        'QueueProcessor',
      );
    }
  }

  private async handleInvoiceGenerated(payload: {
    userId: string;
    invoiceId: string;
    invoiceNumber: string;
    amount: string;
    currency: string;
    downloadUrl?: string;
  }) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });
    if (!user) {
      this.logger.warn(
        `User not found for invoice notification: ${payload.userId}`,
        'QueueProcessor',
      );
      return;
    }

    // Create in-app notification + FCM push
    await this.notificationService.create({
      userId: payload.userId,
      type: 'system',
      channel: 'push',
      title: 'Invoice Generated',
      message: `Invoice ${payload.invoiceNumber} for ${payload.currency} ${payload.amount} is ready`,
      metadata: { invoiceId: payload.invoiceId, invoiceNumber: payload.invoiceNumber },
    });
    await this.pushService.sendToUser(
      payload.userId,
      'Invoice Generated',
      `Invoice ${payload.invoiceNumber} for ${payload.currency} ${payload.amount} is ready for download`,
      { type: 'INVOICE_GENERATED', invoiceId: payload.invoiceId },
    );

    // Send email notification
    try {
      const emailResult = await this.emailService.sendInvoiceEmail(
        payload.userId,
        user.email,
        user.firstName || 'Customer',
        payload.invoiceNumber,
        payload.amount,
        payload.currency,
        payload.downloadUrl,
      );

      // Stamp emailSentAt on the invoice record if email was sent successfully
      if (emailResult?.success && payload.invoiceId) {
        try {
          await this.db
            .update(invoices)
            .set({ emailSentAt: new Date() } as any)
            .where(eq(invoices.id, payload.invoiceId));
        } catch (dbErr: any) {
          this.logger.warn(
            `Failed to update emailSentAt for invoice ${payload.invoiceId}: ${dbErr.message}`,
            'QueueProcessor',
          );
        }
      }

      this.logger.log(
        `Invoice email sent to ${user.email} for ${payload.invoiceNumber}`,
        'QueueProcessor',
      );
    } catch (error: any) {
      this.logger.error(`Failed to send invoice email: ${error.message}`, 'QueueProcessor');
    }
  }
}
