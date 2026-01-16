import { Injectable, Inject, Logger } from '@nestjs/common';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { AWS_CONFIG, AwsConfig } from './aws.config';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface TemplatedEmailOptions {
  to: string | string[];
  templateName: string;
  templateData: Record<string, string>;
}

@Injectable()
export class SesService {
  private readonly logger = new Logger(SesService.name);
  private readonly client: SESClient;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(@Inject(AWS_CONFIG) private readonly config: AwsConfig) {
    this.client = new SESClient({
      region: config.region,
      ...(config.accessKeyId && {
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey!,
        },
      }),
    });
    this.fromEmail = config.ses.fromEmail;
    this.fromName = config.ses.fromName;
  }

  async sendEmail(options: EmailOptions): Promise<string> {
    const toAddresses = Array.isArray(options.to) ? options.to : [options.to];

    const command = new SendEmailCommand({
      Source: `${this.fromName} <${this.fromEmail}>`,
      Destination: {
        ToAddresses: toAddresses,
      },
      Message: {
        Subject: {
          Data: options.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: options.html,
            Charset: 'UTF-8',
          },
          ...(options.text && {
            Text: {
              Data: options.text,
              Charset: 'UTF-8',
            },
          }),
        },
      },
      ...(options.replyTo && {
        ReplyToAddresses: [options.replyTo],
      }),
    });

    const result = await this.client.send(command);

    this.logger.log(`Email sent: ${result.MessageId} to ${toAddresses.join(', ')}`);

    return result.MessageId!;
  }

  // Email templates
  async sendWelcomeEmail(to: string, name: string): Promise<string> {
    return this.sendEmail({
      to,
      subject: 'Welcome to AI Job Portal!',
      html: `
        <h1>Welcome, ${name}!</h1>
        <p>Thank you for joining AI Job Portal. We're excited to help you find your dream job.</p>
        <p>Get started by completing your profile and uploading your resume.</p>
      `,
    });
  }

  async sendVerificationEmail(to: string, otp: string): Promise<string> {
    return this.sendEmail({
      to,
      subject: 'Verify Your Email - AI Job Portal',
      html: `
        <h1>Email Verification</h1>
        <p>Your verification code is: <strong>${otp}</strong></p>
        <p>This code expires in 10 minutes.</p>
      `,
    });
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<string> {
    return this.sendEmail({
      to,
      subject: 'Reset Your Password - AI Job Portal',
      html: `
        <h1>Password Reset</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link expires in 1 hour.</p>
      `,
    });
  }

  async sendApplicationReceivedEmail(
    to: string,
    candidateName: string,
    jobTitle: string,
    companyName: string,
  ): Promise<string> {
    return this.sendEmail({
      to,
      subject: `Application Received - ${jobTitle} at ${companyName}`,
      html: `
        <h1>Application Submitted</h1>
        <p>Hi ${candidateName},</p>
        <p>Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been received.</p>
        <p>We'll notify you when there's an update.</p>
      `,
    });
  }

  async sendInterviewScheduledEmail(
    to: string,
    candidateName: string,
    jobTitle: string,
    companyName: string,
    scheduledAt: Date,
    meetingLink?: string,
  ): Promise<string> {
    return this.sendEmail({
      to,
      subject: `Interview Scheduled - ${jobTitle} at ${companyName}`,
      html: `
        <h1>Interview Scheduled</h1>
        <p>Hi ${candidateName},</p>
        <p>Your interview for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been scheduled.</p>
        <p><strong>Date & Time:</strong> ${scheduledAt.toLocaleString()}</p>
        ${meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>` : ''}
      `,
    });
  }
}
