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
      ...(config.ses?.endpoint && { endpoint: config.ses.endpoint }),
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
    meetingPassword?: string,
    interviewTool?: string,
  ): Promise<string> {
    const toolName = interviewTool
      ? interviewTool.charAt(0).toUpperCase() + interviewTool.slice(1)
      : 'Video';

    const meetingSection = meetingLink
      ? `
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Meeting Platform:</strong> ${toolName}</p>
          <p style="margin: 0 0 10px 0;"><strong>Join Link:</strong> <a href="${meetingLink}" style="color: #2563eb;">${meetingLink}</a></p>
          ${meetingPassword ? `<p style="margin: 0;"><strong>Meeting Password:</strong> ${meetingPassword}</p>` : ''}
        </div>
      `
      : '';

    return this.sendEmail({
      to,
      subject: `Interview Scheduled - ${jobTitle} at ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1f2937;">Interview Scheduled</h1>
          <p>Hi ${candidateName},</p>
          <p>Your interview for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been scheduled.</p>
          <p><strong>Date & Time:</strong> ${scheduledAt.toLocaleString()}</p>
          ${meetingSection}
          <p style="margin-top: 20px;">Please join a few minutes before the scheduled time. Good luck!</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">This is an automated email from AI Job Portal.</p>
        </div>
      `,
    });
  }

  async sendInterviewScheduledEmployerEmail(
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
  ): Promise<string> {
    const toolName = interviewTool
      ? interviewTool.charAt(0).toUpperCase() + interviewTool.slice(1)
      : 'Video';

    const meetingSection = meetingLink
      ? `
        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #0ea5e9;">
          <h3 style="margin: 0 0 10px 0; color: #0369a1;">Meeting Details</h3>
          <p style="margin: 0 0 10px 0;"><strong>Platform:</strong> ${toolName}</p>
          ${hostJoinUrl ? `<p style="margin: 0 0 10px 0;"><strong>Host Join URL:</strong> <a href="${hostJoinUrl}" style="color: #2563eb;">${hostJoinUrl}</a></p>` : `<p style="margin: 0 0 10px 0;"><strong>Meeting Link:</strong> <a href="${meetingLink}" style="color: #2563eb;">${meetingLink}</a></p>`}
          ${meetingPassword ? `<p style="margin: 0;"><strong>Meeting Password:</strong> ${meetingPassword}</p>` : ''}
        </div>
      `
      : '';

    return this.sendEmail({
      to,
      subject: `Interview Scheduled with ${candidateName} for ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1f2937;">Interview Scheduled</h1>
          <p>Hi ${employerName},</p>
          <p>An interview has been scheduled for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.</p>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h3 style="margin: 0 0 10px 0; color: #374151;">Interview Details</h3>
            <p style="margin: 0 0 8px 0;"><strong>Date & Time:</strong> ${scheduledAt.toLocaleString()}</p>
            <p style="margin: 0 0 8px 0;"><strong>Duration:</strong> ${duration} minutes</p>
            <p style="margin: 0 0 8px 0;"><strong>Type:</strong> ${interviewType}</p>
            ${timezone ? `<p style="margin: 0;"><strong>Timezone:</strong> ${timezone}</p>` : ''}
          </div>

          ${meetingSection}

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h3 style="margin: 0 0 10px 0; color: #374151;">Candidate Details</h3>
            <p style="margin: 0 0 8px 0;"><strong>Name:</strong> ${candidateName}</p>
            <p style="margin: 0;"><strong>Email:</strong> <a href="mailto:${candidateEmail}" style="color: #2563eb;">${candidateEmail}</a></p>
          </div>

          <p style="margin-top: 20px;">Please be available a few minutes before the scheduled time.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">This is an automated email from AI Job Portal.</p>
        </div>
      `,
    });
  }

  async sendInterviewRescheduledEmail(
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
  ): Promise<string> {
    const toolName = interviewTool
      ? interviewTool.charAt(0).toUpperCase() + interviewTool.slice(1)
      : 'Video';

    const meetingSection = meetingLink
      ? `
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Meeting Platform:</strong> ${toolName}</p>
          <p style="margin: 0 0 10px 0;"><strong>Join Link:</strong> <a href="${meetingLink}" style="color: #2563eb;">${meetingLink}</a></p>
          ${meetingPassword ? `<p style="margin: 0;"><strong>Meeting Password:</strong> ${meetingPassword}</p>` : ''}
        </div>
      `
      : '';

    return this.sendEmail({
      to,
      subject: `Interview Rescheduled - ${jobTitle} at ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1f2937;">Interview Rescheduled</h1>
          <p>Hi ${candidateName},</p>
          <p>Your interview for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been rescheduled.</p>

          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b;">
            <h3 style="margin: 0 0 10px 0; color: #92400e;">Schedule Change</h3>
            <p style="margin: 0 0 10px 0;"><strong>Previous:</strong> <span style="text-decoration: line-through; color: #ef4444;">${oldScheduledAt.toLocaleString()}</span></p>
            <p style="margin: 0 0 10px 0;"><strong>New Time:</strong> <span style="color: #059669; font-weight: bold;">${newScheduledAt.toLocaleString()}</span></p>
            <p style="margin: 0;"><strong>Duration:</strong> ${duration} minutes</p>
            ${reason ? `<p style="margin: 10px 0 0 0;"><strong>Reason:</strong> ${reason}</p>` : ''}
          </div>

          ${meetingSection}

          <p style="margin-top: 20px;">Please make note of the new time. We apologize for any inconvenience.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">This is an automated email from AI Job Portal.</p>
        </div>
      `,
    });
  }

  async sendInterviewRescheduledEmployerEmail(
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
  ): Promise<string> {
    const toolName = interviewTool
      ? interviewTool.charAt(0).toUpperCase() + interviewTool.slice(1)
      : 'Video';

    const meetingSection = meetingLink
      ? `
        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #0ea5e9;">
          <h3 style="margin: 0 0 10px 0; color: #0369a1;">Meeting Details</h3>
          <p style="margin: 0 0 10px 0;"><strong>Platform:</strong> ${toolName}</p>
          ${hostJoinUrl ? `<p style="margin: 0 0 10px 0;"><strong>Host Join URL:</strong> <a href="${hostJoinUrl}" style="color: #2563eb;">${hostJoinUrl}</a></p>` : `<p style="margin: 0 0 10px 0;"><strong>Meeting Link:</strong> <a href="${meetingLink}" style="color: #2563eb;">${meetingLink}</a></p>`}
          ${meetingPassword ? `<p style="margin: 0;"><strong>Meeting Password:</strong> ${meetingPassword}</p>` : ''}
        </div>
      `
      : '';

    return this.sendEmail({
      to,
      subject: `Interview Rescheduled with ${candidateName} for ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1f2937;">Interview Rescheduled</h1>
          <p>Hi ${employerName},</p>
          <p>The interview with <strong>${candidateName}</strong> for <strong>${jobTitle}</strong> has been rescheduled.</p>

          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b;">
            <h3 style="margin: 0 0 10px 0; color: #92400e;">Schedule Change</h3>
            <p style="margin: 0 0 10px 0;"><strong>Previous:</strong> <span style="text-decoration: line-through; color: #ef4444;">${oldScheduledAt.toLocaleString()}</span></p>
            <p style="margin: 0 0 10px 0;"><strong>New Time:</strong> <span style="color: #059669; font-weight: bold;">${newScheduledAt.toLocaleString()}</span></p>
            <p style="margin: 0;"><strong>Duration:</strong> ${duration} minutes</p>
            ${reason ? `<p style="margin: 10px 0 0 0;"><strong>Reason:</strong> ${reason}</p>` : ''}
          </div>

          ${meetingSection}

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h3 style="margin: 0 0 10px 0; color: #374151;">Candidate</h3>
            <p style="margin: 0;"><strong>Name:</strong> ${candidateName}</p>
          </div>

          <p style="margin-top: 20px;">Please update your calendar with the new time.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">This is an automated email from AI Job Portal.</p>
        </div>
      `,
    });
  }

  async sendInterviewCancelledEmail(
    to: string,
    candidateName: string,
    jobTitle: string,
    companyName: string,
    scheduledAt: Date,
    reason?: string,
  ): Promise<string> {
    return this.sendEmail({
      to,
      subject: `Interview Cancelled - ${jobTitle} at ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1f2937;">Interview Cancelled</h1>
          <p>Hi ${candidateName},</p>

          <div style="background-color: #fee2e2; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ef4444;">
            <h3 style="margin: 0 0 10px 0; color: #991b1b;">Interview Cancelled</h3>
            <p style="margin: 0 0 10px 0;">Unfortunately, your interview for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been cancelled.</p>
            <p style="margin: 0 0 10px 0;"><strong>Original Time:</strong> ${scheduledAt.toLocaleString()}</p>
            ${reason ? `<p style="margin: 0;"><strong>Reason:</strong> ${reason}</p>` : ''}
          </div>

          <p style="margin-top: 20px;">We sincerely apologize for any inconvenience. You will be notified if the interview is rescheduled or if there are any updates regarding your application.</p>

          <p>If you have any questions, please feel free to reach out to the company directly.</p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">This is an automated email from AI Job Portal.</p>
        </div>
      `,
    });
  }

  async sendInterviewCancelledEmployerEmail(
    to: string,
    employerName: string,
    candidateName: string,
    jobTitle: string,
    scheduledAt: Date,
    reason?: string,
  ): Promise<string> {
    return this.sendEmail({
      to,
      subject: `Interview Cancelled with ${candidateName} for ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1f2937;">Interview Cancelled</h1>
          <p>Hi ${employerName},</p>

          <div style="background-color: #fee2e2; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ef4444;">
            <h3 style="margin: 0 0 10px 0; color: #991b1b;">Interview Cancelled</h3>
            <p style="margin: 0 0 10px 0;">The interview with <strong>${candidateName}</strong> for <strong>${jobTitle}</strong> has been cancelled.</p>
            <p style="margin: 0 0 10px 0;"><strong>Original Time:</strong> ${scheduledAt.toLocaleString()}</p>
            ${reason ? `<p style="margin: 0;"><strong>Reason:</strong> ${reason}</p>` : ''}
          </div>

          <p style="margin-top: 20px;">This is a confirmation that the interview has been cancelled from your schedule.</p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">This is an automated email from AI Job Portal.</p>
        </div>
      `,
    });
  }
}
