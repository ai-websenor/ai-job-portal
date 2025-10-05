import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly twilioClient: Twilio;
  private readonly fromPhoneNumber: string;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('app.twilio.accountSid');
    const authToken = this.configService.get<string>('app.twilio.authToken');
    this.fromPhoneNumber = this.configService.get<string>('app.twilio.phoneNumber');

    // Only initialize Twilio if we have valid credentials
    if (accountSid && authToken && this.fromPhoneNumber &&
        accountSid.startsWith('AC') && authToken.length > 10) {
      try {
        this.twilioClient = new Twilio(accountSid, authToken);
        this.logger.log('Twilio SMS service initialized successfully');
      } catch (error) {
        this.logger.warn('Failed to initialize Twilio client. SMS service will be disabled.');
      }
    } else {
      this.logger.warn('Twilio credentials not configured or invalid. SMS service will be disabled.');
    }
  }

  async sendSms(to: string, message: string): Promise<boolean> {
    if (!this.twilioClient) {
      this.logger.error('Twilio client not initialized. Cannot send SMS.');
      return false;
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.fromPhoneNumber,
        to,
      });

      this.logger.log(`SMS sent successfully to ${to}. SID: ${result.sid}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${to}:`, error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  async sendOtp(to: string, otp: string): Promise<boolean> {
    const message = `Your AI Job Portal verification code is: ${otp}. This code will expire in 5 minutes. Do not share this code with anyone.`;
    return this.sendSms(to, message);
  }
}
