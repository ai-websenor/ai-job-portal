import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { Database, notificationLogs } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: Twilio | null = null;
  private fromNumber: string;

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly configService: ConfigService,
  ) {
    const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.get('TWILIO_PHONE_NUMBER') || '';

    if (accountSid && authToken) {
      this.client = new Twilio(accountSid, authToken);
    }
  }

  async sendSms(userId: string, to: string, message: string) {
    if (!this.client) {
      this.logger.warn('Twilio not configured');
      return { success: false, error: 'SMS not configured' };
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to,
      });

      await this.db.insert(notificationLogs).values({
        userId,
        channel: 'sms',
        status: 'sent',
        recipient: to,
        content: message,
        sentAt: new Date(),
      });

      return { success: true, sid: result.sid };
    } catch (error: any) {
      this.logger.error(`Failed to send SMS: ${error.message}`);

      await this.db.insert(notificationLogs).values({
        userId,
        channel: 'sms',
        status: 'failed',
        recipient: to,
        content: message,
        errorMessage: error.message,
      });

      return { success: false, error: error.message };
    }
  }

  async sendOtp(userId: string, to: string, otp: string) {
    const message = `Your AI Job Portal verification code is: ${otp}. Valid for 10 minutes.`;
    return this.sendSms(userId, to, message);
  }

  async sendInterviewReminder(
    userId: string,
    to: string,
    jobTitle: string,
    scheduledAt: Date,
  ) {
    const message = `Reminder: Interview for ${jobTitle} at ${scheduledAt.toLocaleString()}. Good luck!`;
    return this.sendSms(userId, to, message);
  }
}
