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
}
