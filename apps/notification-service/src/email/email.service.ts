import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { SesService } from '@ai-job-portal/aws';
import { Database, notificationLogs, emailTemplates } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly sesService: SesService,
  ) {}

  async sendEmail(userId: string, to: string, subject: string, html: string) {
    try {
      const messageId = await this.sesService.sendEmail({ to, subject, html });

      await this.db.insert(notificationLogs).values({
        userId,
        channel: 'email',
        status: 'sent',
        messageId,
      });

      return { success: true, messageId };
    } catch (error: any) {
      this.logger.error(`Failed to send email: ${error.message}`);

      await this.db.insert(notificationLogs).values({
        userId,
        channel: 'email',
        status: 'failed',
        errorMessage: error.message,
      });

      return { success: false, error: error.message };
    }
  }

  async sendTemplatedEmail(
    userId: string,
    to: string,
    templateName: string,
    variables: Record<string, string>,
  ) {
    const template = await this.db.query.emailTemplates.findFirst({
      where: eq(emailTemplates.name, templateName),
    });

    if (!template) {
      this.logger.error(`Template not found: ${templateName}`);
      return { success: false, error: 'Template not found' };
    }

    let html = template.body;
    let subject = template.subject;

    // Replace variables
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, value);
      subject = subject.replace(regex, value);
    });

    return this.sendEmail(userId, to, subject, html);
  }

  async sendWelcomeEmail(userId: string, to: string, name: string) {
    return this.sesService.sendWelcomeEmail(to, name);
  }

  async sendApplicationReceivedEmail(
    userId: string,
    to: string,
    candidateName: string,
    jobTitle: string,
    companyName: string,
  ) {
    return this.sesService.sendApplicationReceivedEmail(to, candidateName, jobTitle, companyName);
  }

  async sendInterviewScheduledEmail(
    userId: string,
    to: string,
    candidateName: string,
    jobTitle: string,
    companyName: string,
    scheduledAt: Date,
    meetingLink?: string,
  ) {
    return this.sesService.sendInterviewScheduledEmail(
      to,
      candidateName,
      jobTitle,
      companyName,
      scheduledAt,
      meetingLink,
    );
  }

  async sendInterviewScheduledEmployerEmail(
    userId: string,
    to: string,
    employerName: string,
    candidateName: string,
    candidateEmail: string,
    jobTitle: string,
    companyName: string,
    scheduledAt: Date,
    duration: number,
    interviewType: string,
    meetingLink?: string,
    meetingPassword?: string,
    interviewTool?: string,
    hostJoinUrl?: string,
    timezone?: string,
  ) {
    return this.sesService.sendInterviewScheduledEmployerEmail(
      to,
      employerName,
      candidateName,
      candidateEmail,
      jobTitle,
      companyName,
      scheduledAt,
      duration,
      interviewType,
      meetingLink,
      meetingPassword,
      interviewTool,
      hostJoinUrl,
      timezone,
    );
  }

  async sendInterviewRescheduledEmail(
    userId: string,
    to: string,
    candidateName: string,
    jobTitle: string,
    companyName: string,
    oldScheduledAt: Date,
    newScheduledAt: Date,
    duration: number,
    meetingLink?: string,
    meetingPassword?: string,
    interviewTool?: string,
    reason?: string,
  ) {
    return this.sesService.sendInterviewRescheduledEmail(
      to,
      candidateName,
      jobTitle,
      companyName,
      oldScheduledAt,
      newScheduledAt,
      duration,
      meetingLink,
      meetingPassword,
      interviewTool,
      reason,
    );
  }

  async sendInterviewRescheduledEmployerEmail(
    userId: string,
    to: string,
    employerName: string,
    candidateName: string,
    jobTitle: string,
    oldScheduledAt: Date,
    newScheduledAt: Date,
    duration: number,
    meetingLink?: string,
    hostJoinUrl?: string,
    meetingPassword?: string,
    interviewTool?: string,
    reason?: string,
  ) {
    return this.sesService.sendInterviewRescheduledEmployerEmail(
      to,
      employerName,
      candidateName,
      jobTitle,
      oldScheduledAt,
      newScheduledAt,
      duration,
      meetingLink,
      hostJoinUrl,
      meetingPassword,
      interviewTool,
      reason,
    );
  }

  async sendInterviewCancelledEmail(
    userId: string,
    to: string,
    candidateName: string,
    jobTitle: string,
    companyName: string,
    scheduledAt: Date,
    reason?: string,
  ) {
    return this.sesService.sendInterviewCancelledEmail(
      to,
      candidateName,
      jobTitle,
      companyName,
      scheduledAt,
      reason,
    );
  }

  async sendInterviewCancelledEmployerEmail(
    userId: string,
    to: string,
    employerName: string,
    candidateName: string,
    jobTitle: string,
    scheduledAt: Date,
    reason?: string,
  ) {
    return this.sesService.sendInterviewCancelledEmployerEmail(
      to,
      employerName,
      candidateName,
      jobTitle,
      scheduledAt,
      reason,
    );
  }

  async sendJobPostedEmail(userId: string, to: string, employerName: string, jobTitle: string) {
    return this.sesService.sendJobPostedEmail(to, employerName, jobTitle);
  }
}
