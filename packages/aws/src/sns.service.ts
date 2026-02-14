import { Injectable, Inject, Logger } from '@nestjs/common';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { AWS_CONFIG, AwsConfig } from './aws.config';

@Injectable()
export class SnsService {
  private readonly logger = new Logger(SnsService.name);
  private readonly client: SNSClient;
  private readonly senderId?: string;

  constructor(@Inject(AWS_CONFIG) private readonly config: AwsConfig) {
    this.client = new SNSClient({
      region: config.region,
      ...(config.sns?.endpoint && { endpoint: config.sns.endpoint }),
      ...(config.accessKeyId && {
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey!,
        },
      }),
    });

    this.senderId = config.sns?.smsSenderId;
  }

  async sendSms(phoneNumber: string, message: string): Promise<string> {
    const command = new PublishCommand({
      PhoneNumber: phoneNumber,
      Message: message,
      MessageAttributes: {
        ...(this.senderId && {
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: this.senderId,
          },
        }),
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional',
        },
      },
    });

    const result = await this.client.send(command);

    this.logger.log(`SMS sent: ${result.MessageId} to ${phoneNumber}`);

    return result.MessageId!;
  }

  async sendOtp(phoneNumber: string, otp: string): Promise<string> {
    const message = `Your AI Job Portal verification code is: ${otp}. Valid for 10 minutes.`;
    return this.sendSms(phoneNumber, message);
  }

  async sendInterviewReminder(
    phoneNumber: string,
    jobTitle: string,
    companyName: string,
    scheduledAt: Date,
  ): Promise<string> {
    const dateStr = scheduledAt.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const message = `Reminder: Your interview for ${jobTitle} at ${companyName} is scheduled for ${dateStr}. Good luck!`;
    return this.sendSms(phoneNumber, message);
  }

  async sendApplicationStatusUpdate(
    phoneNumber: string,
    jobTitle: string,
    status: string,
  ): Promise<string> {
    const message = `Your application for ${jobTitle} has been updated to: ${status}. Check the app for details.`;
    return this.sendSms(phoneNumber, message);
  }
}
