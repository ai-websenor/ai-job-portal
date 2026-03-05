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

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly configService: ConfigService,
  ) {
    const accessToken = this.configService.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = this.configService.get('WHATSAPP_PHONE_NUMBER_ID');
    const apiUrl = this.configService.get('WHATSAPP_API_URL') || 'https://graph.facebook.com/v19.0';

    if (accessToken && phoneNumberId) {
      this.client = axios.create({
        baseURL: `${apiUrl}/${phoneNumberId}`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.log('WhatsApp Business API client initialized');
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

  async sendJobAlert(userId: string, to: string, jobTitle: string, companyName: string) {
    const components = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: jobTitle },
          { type: 'text', text: companyName },
        ],
      },
    ];

    return this.sendTemplateMessage(userId, to, 'job_alert', 'en', components);
  }

  async sendInterviewReminder(
    userId: string,
    to: string,
    jobTitle: string,
    companyName: string,
    scheduledAt: Date,
  ) {
    const components = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: jobTitle },
          { type: 'text', text: companyName },
          { type: 'text', text: scheduledAt.toLocaleString() },
        ],
      },
    ];

    return this.sendTemplateMessage(userId, to, 'interview_reminder', 'en', components);
  }

  async sendApplicationUpdate(userId: string, to: string, jobTitle: string, status: string) {
    const components = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: jobTitle },
          { type: 'text', text: status },
        ],
      },
    ];

    return this.sendTemplateMessage(userId, to, 'application_update', 'en', components);
  }

  async sendOfferNotification(userId: string, to: string, jobTitle: string, companyName: string) {
    const components = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: jobTitle },
          { type: 'text', text: companyName },
        ],
      },
    ];

    return this.sendTemplateMessage(userId, to, 'offer_notification', 'en', components);
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
