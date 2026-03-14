import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { eq, and, gte, sql } from 'drizzle-orm';
import { Database, notificationLogs } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private client: AxiosInstance | null = null;
  private readonly useTextMessages: boolean;

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly configService: ConfigService,
  ) {
    const accessToken = this.configService.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = this.configService.get('WHATSAPP_PHONE_NUMBER_ID');
    const apiUrl = this.configService.get('WHATSAPP_API_URL') || 'https://graph.facebook.com/v19.0';

    // When true, all notifications are sent as plain text messages instead of templates.
    // Use this during development/Phase 1 before Meta templates are approved.
    this.useTextMessages = this.configService.get('WHATSAPP_USE_TEXT_MESSAGES') === 'true';

    if (accessToken && phoneNumberId) {
      this.client = axios.create({
        baseURL: `${apiUrl}/${phoneNumberId}`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.log(
        `WhatsApp Business API client initialized (mode: ${this.useTextMessages ? 'text-messages' : 'templates'})`,
      );
    } else {
      this.logger.warn('WhatsApp Business API not configured — WhatsApp notifications disabled');
    }
  }

  async sendTemplateMessage(
    userId: string,
    to: string,
    templateName: string,
    languageCode: string = 'en',
    components?: any[],
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.client) {
      this.logger.warn('WhatsApp not configured');
      return { success: false, error: 'WhatsApp not configured' };
    }

    try {
      const response = await this.client.post('/messages', {
        messaging_product: 'whatsapp',
        to: to.replace(/[^0-9]/g, ''),
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          ...(components && { components }),
        },
      });

      const messageId = response.data?.messages?.[0]?.id || '';

      await this.db.insert(notificationLogs).values({
        userId,
        channel: 'whatsapp',
        status: 'sent',
        messageId,
      });

      this.logger.log(`WhatsApp template "${templateName}" sent to ${to}, messageId: ${messageId}`);
      return { success: true, messageId };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      this.logger.error(`Failed to send WhatsApp message: ${errorMsg}`);

      await this.db.insert(notificationLogs).values({
        userId,
        channel: 'whatsapp',
        status: 'failed',
        errorMessage: errorMsg,
      });

      return { success: false, error: errorMsg };
    }
  }

  // Sends hello_world template (always deliverable) then a detailed text (best-effort).
  // Used in dev/Phase-1 (WHATSAPP_USE_TEXT_MESSAGES=true) before custom templates are approved.
  private async sendWithHelloWorldFallback(
    userId: string,
    to: string,
    detailedText: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // hello_world is pre-approved by Meta — always delivers regardless of 24h window
    const templateResult = await this.sendTemplateMessage(userId, to, 'hello_world', 'en_US');

    // Send detailed text immediately after — delivers if candidate has messaged business in last 24h,
    // or after they reply to the hello_world message above
    try {
      await this.sendTextMessage(userId, to, detailedText);
    } catch {
      // Best-effort
    }

    return templateResult;
  }

  async sendJobAlert(userId: string, to: string, jobTitle: string, companyName: string) {
    if (this.useTextMessages) {
      return this.sendWithHelloWorldFallback(
        userId,
        to,
        `New Job Alert!\n\nPosition: ${jobTitle}\nCompany: ${companyName}\n\nLog in to AI Job Portal to view and apply.`,
      );
    }

    return this.sendTemplateMessage(userId, to, 'job_alert', 'en', [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: jobTitle },
          { type: 'text', text: companyName },
        ],
      },
    ]);
  }

  private generateGoogleCalendarUrl(
    title: string,
    description: string,
    startDate: Date,
    durationMinutes: number = 60,
    location: string = '',
  ): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
    const end = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${fmt(startDate)}/${fmt(end)}`,
      details: description,
      location,
    });
    return `https://www.google.com/calendar/render?${params.toString()}`;
  }

  async sendInterviewReminder(
    userId: string,
    to: string,
    jobTitle: string,
    companyName: string,
    scheduledAt: Date,
  ) {
    if (this.useTextMessages) {
      return this.sendWithHelloWorldFallback(
        userId,
        to,
        `Interview Reminder!\n\nPosition: ${jobTitle}\nCompany: ${companyName}\nScheduled: ${scheduledAt.toLocaleString()}\n\nGood luck!`,
      );
    }

    return this.sendTemplateMessage(userId, to, 'interview_reminder', 'en', [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: jobTitle },
          { type: 'text', text: companyName },
          { type: 'text', text: scheduledAt.toLocaleString() },
        ],
      },
    ]);
  }

  async sendInterviewInvitation(
    userId: string,
    to: string,
    jobTitle: string,
    companyName: string,
    scheduledAt: Date,
    meetingLink?: string,
    durationMinutes: number = 60,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const calendarUrl = this.generateGoogleCalendarUrl(
      `Interview: ${jobTitle} at ${companyName}`,
      meetingLink ? `Meeting link: ${meetingLink}` : `Interview for ${jobTitle} at ${companyName}`,
      scheduledAt,
      durationMinutes,
      meetingLink || companyName,
    );

    const detailLines = [
      `Interview Scheduled!`,
      ``,
      `Position: ${jobTitle}`,
      `Company: ${companyName}`,
      `When: ${scheduledAt.toLocaleString()}`,
    ];
    if (meetingLink) detailLines.push(`Meeting Link: ${meetingLink}`);
    detailLines.push(``, `Add to calendar: ${calendarUrl}`);

    if (this.useTextMessages) {
      return this.sendWithHelloWorldFallback(userId, to, detailLines.join('\n'));
    }

    // Template mode: send approved template first, then calendar/meeting link as follow-up text
    const result = await this.sendInterviewReminder(userId, to, jobTitle, companyName, scheduledAt);
    try {
      await this.sendTextMessage(
        userId,
        to,
        [`Add to calendar: ${calendarUrl}`, meetingLink ? `Meeting link: ${meetingLink}` : '']
          .filter(Boolean)
          .join('\n'),
      );
    } catch {
      // Best-effort — only works within 24h customer service window
    }

    return result;
  }

  async sendApplicationUpdate(userId: string, to: string, jobTitle: string, status: string) {
    if (this.useTextMessages) {
      const statusMessages: Record<string, string> = {
        shortlisted: 'Congratulations! You have been shortlisted.',
        interview_scheduled: 'Your interview has been scheduled. Check your email for details.',
        offer_extended: 'Great news! A job offer has been extended to you.',
        rejected: 'Thank you for applying. Unfortunately you were not selected for this role.',
      };
      const statusText = statusMessages[status] || `Status updated to: ${status}`;
      return this.sendWithHelloWorldFallback(
        userId,
        to,
        `Application Update\n\nPosition: ${jobTitle}\n\n${statusText}\n\nLog in to AI Job Portal for more details.`,
      );
    }

    return this.sendTemplateMessage(userId, to, 'application_update', 'en', [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: jobTitle },
          { type: 'text', text: status },
        ],
      },
    ]);
  }

  async sendOfferNotification(userId: string, to: string, jobTitle: string, companyName: string) {
    if (this.useTextMessages) {
      return this.sendWithHelloWorldFallback(
        userId,
        to,
        `Job Offer!\n\nCongratulations! You have received an offer for:\nPosition: ${jobTitle}\nCompany: ${companyName}\n\nLog in to AI Job Portal to review and respond.`,
      );
    }

    return this.sendTemplateMessage(userId, to, 'offer_notification', 'en', [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: jobTitle },
          { type: 'text', text: companyName },
        ],
      },
    ]);
  }

  async sendOfferAccepted(userId: string, to: string, candidateName: string, jobTitle: string) {
    return this.sendWithHelloWorldFallback(
      userId,
      to,
      `Offer Accepted!\n\n${candidateName} has accepted your offer for:\nPosition: ${jobTitle}\n\nLog in to AI Job Portal to proceed with onboarding.`,
    );
  }

  async sendOfferDeclined(
    userId: string,
    to: string,
    candidateName: string,
    jobTitle: string,
    reason?: string,
  ) {
    const lines = [
      `Offer Declined`,
      ``,
      `${candidateName} has declined your offer for:`,
      `Position: ${jobTitle}`,
    ];
    if (reason) lines.push(`Reason: ${reason}`);
    lines.push(``, `Log in to AI Job Portal to review other candidates.`);
    return this.sendWithHelloWorldFallback(userId, to, lines.join('\n'));
  }

  async sendOfferWithdrawn(userId: string, to: string, jobTitle: string, companyName: string) {
    return this.sendWithHelloWorldFallback(
      userId,
      to,
      `Offer Withdrawn\n\nThe job offer for the following position has been withdrawn:\nPosition: ${jobTitle}\nCompany: ${companyName}\n\nPlease contact the employer for more information.`,
    );
  }

  async sendInterviewCancellation(
    userId: string,
    to: string,
    jobTitle: string,
    companyName: string,
    scheduledAt: Date,
    reason?: string,
  ) {
    const lines = [
      `Interview Cancelled`,
      ``,
      `Your interview for the following position has been cancelled:`,
      `Position: ${jobTitle}`,
      `Company: ${companyName}`,
      `Was scheduled: ${scheduledAt.toLocaleString()}`,
    ];
    if (reason) lines.push(`Reason: ${reason}`);
    lines.push(``, `Please check your email or contact the employer for further details.`);

    if (this.useTextMessages) {
      return this.sendWithHelloWorldFallback(userId, to, lines.join('\n'));
    }

    // In template mode, fall back to text since there's no cancellation template yet
    return this.sendWithHelloWorldFallback(userId, to, lines.join('\n'));
  }

  async sendTextMessage(
    userId: string,
    to: string,
    text: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.client) {
      this.logger.warn('WhatsApp not configured');
      return { success: false, error: 'WhatsApp not configured' };
    }

    try {
      const response = await this.client.post('/messages', {
        messaging_product: 'whatsapp',
        to: to.replace(/[^0-9]/g, ''),
        type: 'text',
        text: { body: text },
      });

      const messageId = response.data?.messages?.[0]?.id || '';

      await this.db.insert(notificationLogs).values({
        userId,
        channel: 'whatsapp',
        status: 'sent',
        messageId,
      });

      this.logger.log(`WhatsApp text message sent to ${to}, messageId: ${messageId}`);
      return { success: true, messageId };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      this.logger.error(`Failed to send WhatsApp text message: ${errorMsg}`);

      await this.db.insert(notificationLogs).values({
        userId,
        channel: 'whatsapp',
        status: 'failed',
        errorMessage: errorMsg,
      });

      return { success: false, error: errorMsg };
    }
  }

  async checkDailyRateLimit(userId: string, maxPerDay: number = 5): Promise<boolean> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(notificationLogs)
      .where(
        and(
          eq(notificationLogs.userId, userId),
          eq(notificationLogs.channel, 'whatsapp'),
          eq(notificationLogs.status, 'sent'),
          gte(notificationLogs.sentAt, todayStart),
        ),
      );

    const count = Number(result[0]?.count || 0);
    return count < maxPerDay;
  }
}
