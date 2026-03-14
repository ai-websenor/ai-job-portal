import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { Database, notificationLogs } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { WhatsAppService } from './whatsapp.service';

interface IncomingMessage {
  from: string; // sender's phone number (e.g. "918593855737")
  id: string; // WhatsApp message ID
  timestamp: string;
  type: string; // "text", "image", "audio", etc.
  text?: { body: string };
}

interface StatusUpdate {
  id: string; // wamid of the sent message
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string }>;
}

@Injectable()
export class WhatsAppWebhookService {
  private readonly logger = new Logger(WhatsAppWebhookService.name);
  private readonly verifyToken: string;

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly configService: ConfigService,
    private readonly whatsAppService: WhatsAppService,
  ) {
    this.verifyToken =
      this.configService.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN') || 'aijobportal_webhook_token';
  }

  // ─── Webhook Verification (Meta calls GET on setup) ──────────────────────────

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.verifyToken) {
      this.logger.log('WhatsApp webhook verified successfully');
      return challenge;
    }
    this.logger.warn(`Webhook verification failed — token mismatch`);
    return null;
  }

  // ─── Incoming Event Handler ───────────────────────────────────────────────────

  async handleWebhookEvent(body: any): Promise<void> {
    if (body?.object !== 'whatsapp_business_account') return;

    for (const entry of body?.entry || []) {
      for (const change of entry?.changes || []) {
        if (change?.field !== 'messages') continue;

        const value = change.value;

        // Handle incoming messages from candidates
        for (const message of value?.messages || []) {
          await this.handleIncomingMessage(message, value?.metadata?.phone_number_id);
        }

        // Handle delivery/read status updates for sent messages
        for (const status of value?.statuses || []) {
          await this.handleStatusUpdate(status);
        }
      }
    }
  }

  // ─── Incoming Message ─────────────────────────────────────────────────────────
  // Called when a candidate sends a message TO your business WhatsApp number.
  // This opens the 24-hour customer service window for text messages.

  private async handleIncomingMessage(
    message: IncomingMessage,
    _phoneNumberId: string,
  ): Promise<void> {
    const from = `+${message.from}`;
    const text = message.text?.body || '';

    this.logger.log(`Incoming WhatsApp from ${from}: "${text}"`);

    // Send auto-reply to acknowledge receipt and keep the 24h window open
    try {
      // Find user by mobile number to get userId for logging
      const userId = await this.findUserIdByMobile(message.from);

      const autoReply = [
        'Thank you for your message!',
        '',
        'Your response has been received. Our team will get back to you shortly.',
        '',
        'For job applications and interview details, please log in to AI Job Portal.',
      ].join('\n');

      if (userId) {
        await this.whatsAppService.sendTextMessage(userId, from, autoReply);
      }
    } catch (error: any) {
      this.logger.error(`Failed to send auto-reply to ${from}: ${error.message}`);
    }
  }

  // ─── Delivery / Read Status Update ───────────────────────────────────────────
  // Updates notification_logs with delivery/read status from Meta.

  private async handleStatusUpdate(status: StatusUpdate): Promise<void> {
    this.logger.log(`WhatsApp status update: messageId=${status.id} status=${status.status}`);

    try {
      const dbStatus = status.status === 'failed' ? 'failed' : 'sent';

      await this.db
        .update(notificationLogs)
        .set({
          status: dbStatus as any,
          ...(status.status === 'failed' && status.errors?.length
            ? { errorMessage: `${status.errors[0].code}: ${status.errors[0].title}` }
            : {}),
        })
        .where(eq(notificationLogs.messageId, status.id));

      this.logger.log(`Updated notification log for messageId=${status.id} → ${status.status}`);
    } catch (error: any) {
      this.logger.error(`Failed to update notification log: ${error.message}`);
    }
  }

  // ─── Helper ───────────────────────────────────────────────────────────────────

  private async findUserIdByMobile(mobile: string): Promise<string | null> {
    try {
      // mobile from Meta comes without '+', e.g. "918593855737"
      // DB stores it with '+', e.g. "+918593855737"
      const { users } = await import('@ai-job-portal/database');
      const { like } = await import('drizzle-orm');

      const user = await this.db.query.users.findFirst({
        where: like(users.mobile, `%${mobile}`),
      });
      return user?.id || null;
    } catch {
      return null;
    }
  }
}
