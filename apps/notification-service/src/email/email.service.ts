import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { SesService } from '@ai-job-portal/aws';
import { Database, notificationLogs, emailTemplates } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private layoutHtml: string;

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly sesService: SesService,
    private readonly configService: ConfigService,
  ) {
    this.layoutHtml = this.loadLayout();
  }

  // ─── Core Send Methods ───────────────────────────────────────────────

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
    templateKey: string,
    variables: Record<string, string>,
  ) {
    const template = await this.db.query.emailTemplates.findFirst({
      where: eq(emailTemplates.templateKey, templateKey),
    });

    if (!template) {
      this.logger.warn(`Template not found by key: ${templateKey}, falling back to name lookup`);
      return this.sendTemplatedEmailByName(userId, to, templateKey, variables);
    }

    if (!template.isActive) {
      this.logger.warn(`Template "${templateKey}" is disabled, skipping`);
      return { success: false, error: 'Template is disabled' };
    }

    const settings = await this.getEmailSettings();
    const html = this.renderEmail(template, settings, variables);
    const subject = this.replaceVariables(template.subject, {
      ...variables,
      platformName: settings.platformName || 'AI Job Portal',
    });

    return this.sendEmail(userId, to, subject, html);
  }

  private async sendTemplatedEmailByName(
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

    if (!template.isActive) {
      this.logger.warn(`Template "${templateName}" is disabled, skipping`);
      return { success: false, error: 'Template is disabled' };
    }

    const settings = await this.getEmailSettings();
    const html = this.renderEmail(template, settings, variables);
    const subject = this.replaceVariables(template.subject, {
      ...variables,
      platformName: settings.platformName || 'AI Job Portal',
    });

    return this.sendEmail(userId, to, subject, html);
  }

  // ─── Auth / OTP Emails ──────────────────────────────────────────────

  async sendEmailVerificationOtp(userId: string, to: string, otp: string) {
    const result = await this.sendTemplatedEmail(userId, to, 'EMAIL_VERIFICATION_OTP', {
      otpCode: otp,
      otpExpiry: '10 minutes',
    });
    if (!result.success || result.error === 'Template not found') {
      return this.sesService.sendVerificationEmail(to, otp);
    }
    return result;
  }

  async sendPasswordResetOtp(userId: string, to: string, otp: string) {
    const result = await this.sendTemplatedEmail(userId, to, 'PASSWORD_RESET_OTP', {
      otpCode: otp,
      otpExpiry: '10 minutes',
    });
    if (!result.success || result.error === 'Template not found') {
      return this.sesService.sendPasswordResetOtpEmail(to, otp);
    }
    return result;
  }

  async sendPasswordChangedEmail(userId: string, to: string, firstName: string) {
    const result = await this.sendTemplatedEmail(userId, to, 'PASSWORD_CHANGED', {
      firstName,
    });
    if (!result.success || result.error === 'Template not found') {
      return this.sesService.sendPasswordChangedEmail(to, firstName);
    }
    return result;
  }

  // ─── Welcome Email ──────────────────────────────────────────────────

  async sendWelcomeEmail(userId: string, to: string, name: string, role?: string) {
    const templateKey = role === 'employer' ? 'WELCOME_EMPLOYER' : 'WELCOME_CANDIDATE';
    const result = await this.sendTemplatedEmail(userId, to, templateKey, {
      firstName: name,
      platformName: '',
      actionUrl: '',
    });

    if (!result.success || result.error === 'Template not found') {
      return this.sesService.sendWelcomeEmail(to, name);
    }

    return result;
  }

  // ─── Application Emails ─────────────────────────────────────────────

  async sendApplicationReceivedEmail(
    userId: string,
    to: string,
    candidateName: string,
    jobTitle: string,
    companyName: string,
  ) {
    const result = await this.sendTemplatedEmail(userId, to, 'JOB_APPLICATION_CONFIRMATION', {
      firstName: candidateName,
      jobTitle,
      companyName,
      actionUrl: '',
    });

    if (!result.success || result.error === 'Template not found') {
      return this.sesService.sendApplicationReceivedEmail(to, candidateName, jobTitle, companyName);
    }

    return result;
  }

  async sendNewApplicationEmployerEmail(
    userId: string,
    to: string,
    employerName: string,
    candidateName: string,
    jobTitle: string,
    companyName: string,
  ) {
    const result = await this.sendTemplatedEmail(userId, to, 'NEW_CANDIDATE_APPLICATION', {
      firstName: employerName,
      candidateName,
      jobTitle,
      actionUrl: '',
    });

    if (!result.success || result.error === 'Template not found') {
      return this.sendEmail(
        userId,
        to,
        `New Application for ${jobTitle}`,
        `<h2>New Application Received</h2>
        <p>Hi ${employerName},</p>
        <p><strong>${candidateName}</strong> has applied for the position of <strong>${jobTitle}</strong> at ${companyName}.</p>
        <p>Log in to your dashboard to review the application.</p>
        <p>Best regards,<br>AI Job Portal Team</p>`,
      );
    }

    return result;
  }

  async sendApplicationStatusUpdateEmail(
    userId: string,
    to: string,
    firstName: string,
    jobTitle: string,
    companyName: string,
    status: string,
  ) {
    const result = await this.sendTemplatedEmail(userId, to, 'APPLICATION_STATUS_UPDATE', {
      firstName,
      jobTitle,
      companyName,
      status,
      actionUrl: '',
    });

    if (!result.success || result.error === 'Template not found') {
      const statusMessages: Record<string, string> = {
        reviewing: 'is being reviewed by the hiring team',
        shortlisted: 'has been shortlisted! The employer is interested in your profile',
        interview_scheduled: 'has moved to the interview stage',
        offer_extended: 'has resulted in a job offer! Congratulations',
        rejected: 'was not selected for this position',
        withdrawn: 'has been withdrawn as requested',
      };
      const statusMessage = statusMessages[status] || `has been updated to: ${status}`;

      return this.sendEmail(
        userId,
        to,
        `Application Update: ${jobTitle}`,
        `<h2>Application Status Update</h2>
        <p>Hi ${firstName},</p>
        <p>Your application for <strong>${jobTitle}</strong> at ${companyName || 'the company'} ${statusMessage}.</p>
        <p>Log in to your dashboard to view more details.</p>
        <p>Best regards,<br>AI Job Portal Team</p>`,
      );
    }

    return result;
  }

  async sendApplicationWithdrawnEmail(
    userId: string,
    to: string,
    employerName: string,
    candidateName: string,
    jobTitle: string,
  ) {
    const result = await this.sendTemplatedEmail(userId, to, 'APPLICATION_WITHDRAWN', {
      firstName: employerName,
      candidateName,
      jobTitle,
      actionUrl: '',
    });

    if (!result.success || result.error === 'Template not found') {
      return this.sendEmail(
        userId,
        to,
        `Application Withdrawn - ${jobTitle}`,
        `<h2>Application Withdrawn</h2>
        <p>Hi ${employerName},</p>
        <p><strong>${candidateName}</strong> has withdrawn their application for <strong>${jobTitle}</strong>.</p>
        <p>Best regards,<br>AI Job Portal Team</p>`,
      );
    }

    return result;
  }

  // ─── Interview Emails ───────────────────────────────────────────────

  async sendInterviewScheduledEmail(
    userId: string,
    to: string,
    candidateName: string,
    jobTitle: string,
    companyName: string,
    scheduledAt: Date,
    meetingLink?: string,
  ) {
    const result = await this.sendTemplatedEmail(userId, to, 'INTERVIEW_SCHEDULED', {
      firstName: candidateName,
      jobTitle,
      companyName,
      interviewDate: scheduledAt.toLocaleString(),
      actionUrl: meetingLink || '',
    });

    if (!result.success || result.error === 'Template not found') {
      return this.sesService.sendInterviewScheduledEmail(
        to,
        candidateName,
        jobTitle,
        companyName,
        scheduledAt,
        meetingLink,
      );
    }

    return result;
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
    const result = await this.sendTemplatedEmail(userId, to, 'EMPLOYER_INTERVIEW_SCHEDULED', {
      firstName: employerName,
      candidateName,
      candidateEmail,
      jobTitle,
      companyName,
      interviewDate: scheduledAt.toLocaleString(),
      duration: String(duration),
      interviewType,
      meetingLink: meetingLink || '',
      meetingPassword: meetingPassword || '',
      interviewTool: interviewTool || '',
      hostJoinUrl: hostJoinUrl || '',
      timezone: timezone || 'Asia/Kolkata',
      actionUrl: hostJoinUrl || meetingLink || '',
    });

    if (!result.success || result.error === 'Template not found') {
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

    return result;
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
    const result = await this.sendTemplatedEmail(userId, to, 'INTERVIEW_RESCHEDULED', {
      firstName: candidateName,
      jobTitle,
      companyName,
      oldInterviewDate: oldScheduledAt.toLocaleString(),
      interviewDate: newScheduledAt.toLocaleString(),
      duration: String(duration),
      meetingLink: meetingLink || '',
      meetingPassword: meetingPassword || '',
      interviewTool: interviewTool || '',
      reason: reason || '',
      actionUrl: meetingLink || '',
    });

    if (!result.success || result.error === 'Template not found') {
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

    return result;
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
    const result = await this.sendTemplatedEmail(userId, to, 'EMPLOYER_INTERVIEW_RESCHEDULED', {
      firstName: employerName,
      candidateName,
      jobTitle,
      oldInterviewDate: oldScheduledAt.toLocaleString(),
      interviewDate: newScheduledAt.toLocaleString(),
      duration: String(duration),
      meetingLink: meetingLink || '',
      hostJoinUrl: hostJoinUrl || '',
      meetingPassword: meetingPassword || '',
      interviewTool: interviewTool || '',
      reason: reason || '',
      actionUrl: hostJoinUrl || meetingLink || '',
    });

    if (!result.success || result.error === 'Template not found') {
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

    return result;
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
    const result = await this.sendTemplatedEmail(userId, to, 'INTERVIEW_CANCELLED', {
      firstName: candidateName,
      jobTitle,
      companyName,
      interviewDate: scheduledAt.toLocaleString(),
      reason: reason || '',
      actionUrl: '',
    });

    if (!result.success || result.error === 'Template not found') {
      return this.sesService.sendInterviewCancelledEmail(
        to,
        candidateName,
        jobTitle,
        companyName,
        scheduledAt,
        reason,
      );
    }

    return result;
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
    const result = await this.sendTemplatedEmail(userId, to, 'EMPLOYER_INTERVIEW_CANCELLED', {
      firstName: employerName,
      candidateName,
      jobTitle,
      interviewDate: scheduledAt.toLocaleString(),
      reason: reason || '',
      actionUrl: '',
    });

    if (!result.success || result.error === 'Template not found') {
      return this.sesService.sendInterviewCancelledEmployerEmail(
        to,
        employerName,
        candidateName,
        jobTitle,
        scheduledAt,
        reason,
      );
    }

    return result;
  }

  // ─── Offer Emails ───────────────────────────────────────────────────

  async sendOfferExtendedEmail(
    userId: string,
    to: string,
    candidateName: string,
    jobTitle: string,
    companyName: string,
    salary?: string,
    joiningDate?: string,
  ) {
    const result = await this.sendTemplatedEmail(userId, to, 'JOB_OFFER_RECEIVED', {
      firstName: candidateName,
      jobTitle,
      companyName,
      salary: salary || '',
      joiningDate: joiningDate || '',
      actionUrl: '',
    });

    if (!result.success || result.error === 'Template not found') {
      return this.sesService.sendOfferExtendedEmail(
        to,
        candidateName,
        jobTitle,
        companyName,
        salary,
        joiningDate,
      );
    }

    return result;
  }

  async sendOfferAcceptedEmployerEmail(
    userId: string,
    to: string,
    employerName: string,
    candidateName: string,
    jobTitle: string,
  ) {
    const result = await this.sendTemplatedEmail(userId, to, 'OFFER_ACCEPTED_EMPLOYER', {
      firstName: employerName,
      candidateName,
      jobTitle,
      actionUrl: '',
    });

    if (!result.success || result.error === 'Template not found') {
      return this.sesService.sendOfferAcceptedEmail(to, employerName, candidateName, jobTitle);
    }

    return result;
  }

  async sendOfferDeclinedEmployerEmail(
    userId: string,
    to: string,
    employerName: string,
    candidateName: string,
    jobTitle: string,
    reason?: string,
  ) {
    const result = await this.sendTemplatedEmail(userId, to, 'OFFER_DECLINED_EMPLOYER', {
      firstName: employerName,
      candidateName,
      jobTitle,
      reason: reason || 'No reason provided',
      actionUrl: '',
    });

    if (!result.success || result.error === 'Template not found') {
      return this.sesService.sendOfferDeclinedEmail(
        to,
        employerName,
        candidateName,
        jobTitle,
        reason,
      );
    }

    return result;
  }

  async sendOfferWithdrawnEmail(
    userId: string,
    to: string,
    candidateName: string,
    jobTitle: string,
    companyName: string,
  ) {
    const result = await this.sendTemplatedEmail(userId, to, 'OFFER_WITHDRAWN_CANDIDATE', {
      firstName: candidateName,
      jobTitle,
      companyName,
      actionUrl: '',
    });

    if (!result.success || result.error === 'Template not found') {
      return this.sesService.sendOfferWithdrawnEmail(to, candidateName, jobTitle, companyName);
    }

    return result;
  }

  // ─── Job Emails ─────────────────────────────────────────────────────

  async sendJobPostedEmail(userId: string, to: string, employerName: string, jobTitle: string) {
    const result = await this.sendTemplatedEmail(userId, to, 'JOB_POSTED_CONFIRMATION', {
      firstName: employerName,
      jobTitle,
      actionUrl: '',
    });

    if (!result.success || result.error === 'Template not found') {
      return this.sesService.sendJobPostedEmail(to, employerName, jobTitle);
    }

    return result;
  }

  // ─── Account Status Emails ─────────────────────────────────────────

  async sendAccountApprovedEmail(userId: string, to: string, firstName: string) {
    return this.sendTemplatedEmail(userId, to, 'ACCOUNT_APPROVED', {
      firstName,
      platformName: '',
      actionUrl: '',
    });
  }

  async sendAccountRejectedEmail(userId: string, to: string, firstName: string, reason?: string) {
    return this.sendTemplatedEmail(userId, to, 'ACCOUNT_REJECTED', {
      firstName,
      reason: reason || 'Your account did not meet our verification criteria.',
      platformName: '',
      actionUrl: '',
    });
  }

  async sendAccountSuspendedEmail(userId: string, to: string, firstName: string, reason?: string) {
    return this.sendTemplatedEmail(userId, to, 'ACCOUNT_SUSPENDED', {
      firstName,
      reason: reason || 'Your account has been suspended due to a policy violation.',
      platformName: '',
      actionUrl: '',
    });
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  private async getEmailSettings() {
    try {
      const settings = await this.db.query.emailSettings.findFirst();
      return settings || this.getDefaultSettings();
    } catch {
      return this.getDefaultSettings();
    }
  }

  private getDefaultSettings() {
    return {
      platformName: 'AI Job Portal',
      logoUrl: null as string | null,
      supportEmail: null as string | null,
      contactEmail: null as string | null,
      companyAddress: null as string | null,
      domainUrl: null as string | null,
      footerText: null as string | null,
    };
  }

  private buildCtaUrl(template: any, variables: Record<string, string>): string {
    // If ctaRelativePath is set, construct full URL using BASE_URL
    if (template.ctaRelativePath) {
      const baseUrl = (
        this.configService.get<string>('BASE_URL') || 'https://dev.d3tubn69g0t2tw.amplifyapp.com'
      ).replace(/\/+$/, '');
      const relativePath = template.ctaRelativePath.startsWith('/')
        ? template.ctaRelativePath
        : `/${template.ctaRelativePath}`;
      return this.replaceVariables(`${baseUrl}${relativePath}`, variables);
    }
    // Fallback to ctaUrl for backward compatibility
    return template.ctaUrl ? this.replaceVariables(template.ctaUrl, variables) : '';
  }

  private renderEmail(template: any, settings: any, variables: Record<string, string>): string {
    const allVars = {
      ...variables,
      platformName: settings.platformName || 'AI Job Portal',
    };

    const content = this.replaceVariables(template.content, allVars);
    const title = this.replaceVariables(template.title, allVars);
    const subject = this.replaceVariables(template.subject, allVars);

    // Respect per-template logoEnabled flag (default true for backward compat)
    const logoEnabled = template.logoEnabled !== false;
    const logoUrl = logoEnabled ? settings.logoUrl : null;

    // Respect per-template ctaEnabled flag (default true for backward compat)
    const ctaEnabled = template.ctaEnabled !== false;
    const ctaText =
      ctaEnabled && template.ctaText ? this.replaceVariables(template.ctaText, allVars) : '';
    const ctaUrl = ctaEnabled ? this.buildCtaUrl(template, allVars) : '';

    const otpCode = variables['otpCode'] || '';
    const otpExpiry = variables['otpExpiry'] || '';

    let html = this.layoutHtml;
    html = this.replaceConditionalBlock(html, 'logoUrl', logoUrl);
    html = this.replaceConditionalBlock(html, 'bannerImageUrl', template.bannerImageUrl);
    html = this.replaceConditionalBlock(html, 'otpCode', otpCode);
    html = this.replaceConditionalBlock(html, 'otpExpiry', otpExpiry);
    html = this.replaceConditionalBlock(html, 'ctaText', ctaText);
    html = this.replaceConditionalBlock(html, 'footerText', settings.footerText);
    html = this.replaceConditionalBlock(html, 'companyAddress', settings.companyAddress);
    html = this.replaceConditionalBlock(html, 'supportEmail', settings.supportEmail);
    html = this.replaceConditionalBlock(html, 'domainUrl', settings.domainUrl);

    html = html.replace(/\{\{logoUrl\}\}/g, logoUrl || '');
    html = html.replace(/\{\{platformName\}\}/g, settings.platformName || 'AI Job Portal');
    html = html.replace(/\{\{bannerImageUrl\}\}/g, template.bannerImageUrl || '');
    html = html.replace(/\{\{title\}\}/g, title);
    html = html.replace(/\{\{content\}\}/g, content.replace(/\n/g, '<br>'));
    html = html.replace(/\{\{otpCode\}\}/g, otpCode);
    html = html.replace(/\{\{otpExpiry\}\}/g, otpExpiry);
    html = html.replace(/\{\{ctaText\}\}/g, ctaText);
    html = html.replace(/\{\{ctaUrl\}\}/g, ctaUrl);
    html = html.replace(/\{\{subject\}\}/g, subject);
    html = html.replace(/\{\{supportEmail\}\}/g, settings.supportEmail || '');
    html = html.replace(/\{\{contactEmail\}\}/g, settings.contactEmail || '');
    html = html.replace(/\{\{companyAddress\}\}/g, settings.companyAddress || '');
    html = html.replace(/\{\{domainUrl\}\}/g, settings.domainUrl || '');
    html = html.replace(/\{\{footerText\}\}/g, settings.footerText || '');

    return html;
  }

  private replaceConditionalBlock(html: string, key: string, value: any): string {
    const regex = new RegExp(`\\{\\{#if ${key}\\}\\}([\\s\\S]*?)\\{\\{/if\\}\\}`, 'g');
    if (value) {
      return html.replace(regex, '$1');
    }
    return html.replace(regex, '');
  }

  private replaceVariables(text: string, variables: Record<string, string>): string {
    let result = text;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
    });
    return result;
  }

  private loadLayout(): string {
    try {
      return fs.readFileSync(path.join(__dirname, 'templates', 'email-layout.html'), 'utf-8');
    } catch {
      this.logger.warn('Could not load email-layout.html from disk, using inline fallback');
      return this.getInlineLayout();
    }
  }

  private getInlineLayout(): string {
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>{{subject}}</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;">
<tr><td align="center" style="padding:24px 0;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;max-width:600px;width:100%;">
<tr><td align="center" style="padding:24px;">{{#if logoUrl}}<img src="{{logoUrl}}" alt="{{platformName}}" width="160" style="display:block;max-width:160px;height:auto;" />{{/if}}</td></tr>
{{#if bannerImageUrl}}<tr><td style="padding:0 24px 16px;"><img src="{{bannerImageUrl}}" alt="" width="552" style="display:block;width:100%;max-width:552px;height:auto;border-radius:4px;" /></td></tr>{{/if}}
<tr><td style="padding:8px 24px;"><h1 style="margin:0;font-size:22px;font-weight:bold;color:#333333;">{{title}}</h1></td></tr>
<tr><td style="padding:8px 24px 16px;font-size:15px;line-height:1.6;color:#555555;">{{content}}</td></tr>
{{#if otpCode}}<tr><td align="center" style="padding:8px 24px 24px;"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:320px;"><tr><td align="center" style="background-color:#f0f4ff;border:2px dashed #2563eb;border-radius:12px;padding:24px 16px;"><p style="margin:0 0 8px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:2px;">Your verification code</p><p id="otp-code" style="margin:0;font-size:40px;font-weight:900;color:#1e40af;letter-spacing:10px;font-family:'Courier New',Courier,monospace;">{{otpCode}}</p><p style="margin:12px 0 0 0;font-size:12px;color:#9ca3af;">Expires in {{otpExpiry}}</p><table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:16px;"><tr><td style="border-radius:6px;background-color:#2563eb;"><a id="copy-otp-btn" href="#" onclick="navigator.clipboard.writeText('{{otpCode}}');var btn=document.getElementById('copy-otp-btn');btn.innerText='Copied!';btn.style.backgroundColor='#16a34a';setTimeout(function(){btn.innerText='Copy Code';btn.style.backgroundColor='#2563eb';},2000);return false;" style="display:inline-block;padding:8px 20px;font-size:13px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;background-color:#2563eb;">Copy Code</a></td></tr></table></td></tr></table></td></tr>{{/if}}
{{#if ctaText}}<tr><td align="center" style="padding:8px 24px 24px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:6px;background-color:#2563eb;"><a href="{{ctaUrl}}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;">{{ctaText}}</a></td></tr></table></td></tr>{{/if}}
<tr><td style="padding:0 24px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" /></td></tr>
<tr><td style="padding:16px 24px 24px;font-size:12px;line-height:1.5;color:#9ca3af;text-align:center;">
{{#if footerText}}<p style="margin:0 0 8px;">{{footerText}}</p>{{/if}}
{{#if companyAddress}}<p style="margin:0 0 4px;">{{companyAddress}}</p>{{/if}}
{{#if supportEmail}}<p style="margin:0 0 4px;">Support: <a href="mailto:{{supportEmail}}" style="color:#6b7280;">{{supportEmail}}</a></p>{{/if}}
{{#if domainUrl}}<p style="margin:0;"><a href="{{domainUrl}}" style="color:#6b7280;">{{domainUrl}}</a></p>{{/if}}
</td></tr></table></td></tr></table></body></html>`;
  }
}
