import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { eq, and, ilike, count, or } from 'drizzle-orm';
import { Database, emailTemplates } from '@ai-job-portal/database';
import { S3Service } from '@ai-job-portal/aws';
import { ConfigService } from '@nestjs/config';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateEmailTemplateDto, UpdateEmailTemplateDto, EmailTemplateQueryDto } from './dto';
import type { MultipartFile } from '@fastify/multipart';
import * as fs from 'fs';
import * as path from 'path';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

const SAMPLE_DATA: Record<string, string> = {
  firstName: 'John Doe',
  lastName: 'Doe',
  jobTitle: 'Software Engineer',
  companyName: 'Google',
  interviewDate: 'Tomorrow 10 AM',
  actionUrl: 'https://example.com/action',
  platformName: 'AI Job Portal',
  status: 'Shortlisted',
  planName: 'Premium',
  amount: '$49.99',
  ticketId: 'TKT-2025-001',
};

@Injectable()
export class EmailTemplatesService {
  private readonly logger = new Logger(EmailTemplatesService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateEmailTemplateDto, adminId?: string) {
    const existing = await this.db.query.emailTemplates.findFirst({
      where: eq(emailTemplates.templateKey, dto.templateKey),
    });

    if (existing) {
      throw new ConflictException(`Template with key "${dto.templateKey}" already exists`);
    }

    const [template] = await this.db
      .insert(emailTemplates)
      .values({
        templateKey: dto.templateKey,
        name: dto.name,
        subject: dto.subject,
        title: dto.title,
        content: dto.content,
        logoEnabled: dto.logoEnabled ?? true,
        ctaEnabled: dto.ctaEnabled ?? true,
        ctaText: dto.ctaText || null,
        ctaUrl: dto.ctaUrl || null,
        ctaRelativePath: dto.ctaRelativePath || null,
        bannerImageUrl: dto.bannerImageUrl || null,
        variables: dto.variables || [],
        createdBy: adminId || null,
      })
      .returning();

    return template;
  }

  async findAll(query: EmailTemplateQueryDto) {
    const { page = 1, limit = 20, isActive, search } = query;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (isActive !== undefined) {
      conditions.push(eq(emailTemplates.isActive, isActive));
    }

    if (search) {
      conditions.push(
        or(
          ilike(emailTemplates.name, `%${search}%`),
          ilike(emailTemplates.templateKey, `%${search}%`),
          ilike(emailTemplates.subject, `%${search}%`),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [templates, [{ total }]] = await Promise.all([
      this.db.query.emailTemplates.findMany({
        where: whereClause,
        limit,
        offset,
        orderBy: (t, { asc }) => [asc(t.name)],
      }),
      this.db.select({ total: count() }).from(emailTemplates).where(whereClause),
    ]);

    const totalCount = Number(total);
    const pageCount = Math.ceil(totalCount / limit);

    return {
      data: templates,
      pagination: {
        totalEmailTemplate: totalCount,
        pageCount,
        currentPage: page,
        hasNextPage: page < pageCount,
      },
    };
  }

  async findOne(id: string) {
    const template = await this.db.query.emailTemplates.findFirst({
      where: eq(emailTemplates.id, id),
    });

    if (!template) {
      throw new NotFoundException(`Email template not found`);
    }

    return template;
  }

  async findByKey(templateKey: string) {
    const template = await this.db.query.emailTemplates.findFirst({
      where: eq(emailTemplates.templateKey, templateKey),
    });

    if (!template) {
      throw new NotFoundException(`Email template with key "${templateKey}" not found`);
    }

    return template;
  }

  async update(id: string, dto: UpdateEmailTemplateDto) {
    const existing = await this.db.query.emailTemplates.findFirst({
      where: eq(emailTemplates.id, id),
    });

    if (!existing) {
      throw new NotFoundException(`Email template not found`);
    }

    const [updated] = await this.db
      .update(emailTemplates)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.id, id))
      .returning();

    return updated;
  }

  async remove(id: string) {
    const existing = await this.db.query.emailTemplates.findFirst({
      where: eq(emailTemplates.id, id),
    });

    if (!existing) {
      throw new NotFoundException(`Email template not found`);
    }

    await this.db.delete(emailTemplates).where(eq(emailTemplates.id, id));

    return { message: 'Email template deleted successfully' };
  }

  async uploadBanner(id: string, data: MultipartFile) {
    const template = await this.findOne(id);

    const buffer = await data.toBuffer();
    this.logger.log(
      `Banner upload: file=${data.filename}, mime=${data.mimetype}, size=${buffer.length} bytes, templateId=${id}`,
    );

    if (!ALLOWED_IMAGE_TYPES.includes(data.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, WebP allowed');
    }
    if (buffer.length > MAX_IMAGE_SIZE) {
      throw new BadRequestException('File too large. Max 2MB allowed');
    }

    // Delete old banner from S3
    if (template.bannerImageUrl) {
      try {
        const oldKey = this.s3Service.extractKeyFromUrl(template.bannerImageUrl);
        this.logger.log(`Deleting old banner from S3: key=${oldKey}`);
        if (oldKey) {
          await this.s3Service.delete(oldKey);
          this.logger.log(`Old banner deleted: ${oldKey}`);
        }
      } catch (err: any) {
        this.logger.warn(`Failed to delete old banner: ${err.message}`);
      }
    }

    // Upload new banner
    const key = this.s3Service.generateKey('email-template-banners', data.filename);
    this.logger.log(`Uploading banner to S3: key=${key}`);
    const uploadResult = await this.s3Service.upload(key, buffer, data.mimetype);
    this.logger.log(`Banner uploaded: url=${uploadResult.url}`);

    // Update database
    const [updated] = await this.db
      .update(emailTemplates)
      .set({
        bannerImageUrl: uploadResult.url,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.id, id))
      .returning();

    return {
      message: 'Banner image uploaded successfully',
      data: updated,
    };
  }

  async deleteBanner(id: string) {
    const template = await this.findOne(id);

    if (!template.bannerImageUrl) {
      return { message: 'No banner image to delete', data: template };
    }

    // Delete from S3
    try {
      const key = this.s3Service.extractKeyFromUrl(template.bannerImageUrl);
      if (key) {
        await this.s3Service.delete(key);
      }
    } catch {
      // Ignore S3 deletion errors
    }

    // Clear from database
    const [updated] = await this.db
      .update(emailTemplates)
      .set({
        bannerImageUrl: null,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.id, id))
      .returning();

    return { message: 'Banner image deleted successfully', data: updated };
  }

  async preview(id: string, sampleData?: Record<string, string>) {
    const template = await this.findOne(id);
    const settings = await this.getEmailSettings();

    // Only inject OTP sample data if this template uses otpCode
    const templateVars: string[] = Array.isArray(template.variables)
      ? (template.variables as string[])
      : [];
    const otpSample: Record<string, string> = templateVars.includes('otpCode')
      ? { otpCode: '827244', otpExpiry: '10 minutes' }
      : {};

    const variables = { ...SAMPLE_DATA, ...otpSample, ...sampleData };

    const renderedHtml = this.renderEmail(template, settings, variables);

    return {
      subject: this.replaceVariables(template.subject, variables),
      html: renderedHtml,
      bannerImageUrl: template.bannerImageUrl || null,
    };
  }

  async seedTemplates() {
    const templates = this.getDefaultTemplates();
    let created = 0;
    let skipped = 0;

    for (const tpl of templates) {
      const existing = await this.db.query.emailTemplates.findFirst({
        where: eq(emailTemplates.templateKey, tpl.templateKey),
      });

      if (existing) {
        skipped++;
        continue;
      }

      await this.db.insert(emailTemplates).values(tpl);
      created++;
    }

    return { message: `Seeded ${created} templates, skipped ${skipped} existing` };
  }

  private async getEmailSettings() {
    const settings = await this.db.query.emailSettings.findFirst();
    return (
      settings || {
        platformName: 'AI Job Portal',
        logoUrl: null,
        supportEmail: null,
        contactEmail: null,
        companyAddress: null,
        domainUrl: null,
        footerText: null,
      }
    );
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
    let layoutHtml: string;
    try {
      layoutHtml = fs.readFileSync(
        path.join(
          __dirname,
          '..',
          '..',
          '..',
          'notification-service',
          'src',
          'email',
          'templates',
          'email-layout.html',
        ),
        'utf-8',
      );
    } catch {
      layoutHtml = this.getInlineLayout();
    }

    const content = this.replaceVariables(template.content, variables);
    const title = this.replaceVariables(template.title, variables);
    const subject = this.replaceVariables(template.subject, variables);

    // Respect per-template logoEnabled flag (default true for backward compat)
    const logoEnabled = template.logoEnabled !== false;
    const logoUrl = logoEnabled ? settings.logoUrl : null;

    // Respect per-template ctaEnabled flag (default true for backward compat)
    const ctaEnabled = template.ctaEnabled !== false;
    const ctaText =
      ctaEnabled && template.ctaText ? this.replaceVariables(template.ctaText, variables) : '';
    const ctaUrl = ctaEnabled ? this.buildCtaUrl(template, variables) : '';

    const otpCode = variables['otpCode'] || '';
    const otpExpiry = variables['otpExpiry'] || '';

    let html = layoutHtml;
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
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    return result;
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

  private getDefaultTemplates() {
    return [
      // === OTP / Auth Codes ===
      {
        templateKey: 'EMAIL_VERIFICATION_OTP',
        name: 'Email Verification OTP',
        subject: 'Your {{platformName}} verification code',
        title: 'Verify Your Email Address',
        content:
          'Hi,\n\nPlease use the verification code below to confirm your email address. This code is valid for 10 minutes.\n\nDo not share this code with anyone.',
        logoEnabled: true,
        ctaEnabled: false,
        ctaText: null,
        ctaUrl: null,
        ctaRelativePath: null,
        variables: ['otpCode', 'otpExpiry', 'platformName'],
      },
      {
        templateKey: 'PASSWORD_RESET_OTP',
        name: 'Password Reset OTP',
        subject: 'Your {{platformName}} password reset code',
        title: 'Reset Your Password',
        content:
          "Hi,\n\nWe received a request to reset your password. Use the code below to proceed. This code expires in 10 minutes.\n\nIf you didn't request a password reset, you can safely ignore this email.",
        logoEnabled: true,
        ctaEnabled: false,
        ctaText: null,
        ctaUrl: null,
        ctaRelativePath: null,
        variables: ['otpCode', 'otpExpiry', 'platformName'],
      },
      {
        templateKey: 'PASSWORD_CHANGED',
        name: 'Password Changed',
        subject: 'Your {{platformName}} password has been changed',
        title: 'Password Changed Successfully',
        content:
          'Hi {{firstName}},\n\nYour password has been changed successfully.\n\nIf you did not make this change, please reset your password immediately or contact our support team.',
        ctaText: 'Secure My Account',
        ctaRelativePath: '/auth/forgot-password',
        variables: ['firstName', 'platformName'],
      },
      // === Authentication ===
      {
        templateKey: 'WELCOME_CANDIDATE',
        name: 'Welcome Candidate',
        subject: 'Welcome to {{platformName}}, {{firstName}}!',
        title: 'Welcome Aboard!',
        content:
          "Hi {{firstName}},\n\nThank you for joining {{platformName}}! We're excited to help you find your dream job.\n\nComplete your profile to get personalized job recommendations and stand out to employers.",
        ctaText: 'Complete Your Profile',
        ctaRelativePath: '/profile',
        variables: ['firstName', 'platformName'],
      },
      {
        templateKey: 'WELCOME_EMPLOYER',
        name: 'Welcome Employer',
        subject: 'Welcome to {{platformName}}, {{firstName}}!',
        title: 'Welcome to {{platformName}}!',
        content:
          'Hi {{firstName}},\n\nThank you for registering your company on {{platformName}}. You can now post jobs and find the best talent.\n\nSet up your company profile to attract top candidates.',
        ctaText: 'Set Up Company Profile',
        ctaRelativePath: '/employee/profile',
        variables: ['firstName', 'platformName'],
      },
      {
        templateKey: 'EMAIL_VERIFICATION',
        name: 'Email Verification',
        subject: 'Verify your email address',
        title: 'Verify Your Email',
        content:
          'Hi {{firstName}},\n\nPlease verify your email address to complete your registration. Click the button below to verify.',
        ctaText: 'Verify Email',
        ctaRelativePath: '/auth/verify-email',
        variables: ['firstName'],
      },
      {
        templateKey: 'PASSWORD_RESET_REQUEST',
        name: 'Password Reset Request',
        subject: 'Reset your password',
        title: 'Password Reset Request',
        content:
          'Hi {{firstName}},\n\nWe received a request to reset your password. Click the button below to set a new password. This link will expire in 1 hour.\n\nIf you did not request a password reset, please ignore this email.',
        ctaText: 'Reset Password',
        ctaRelativePath: '/auth/reset-password',
        variables: ['firstName'],
      },
      {
        templateKey: 'PASSWORD_RESET_SUCCESS',
        name: 'Password Reset Success',
        subject: 'Your password has been reset',
        title: 'Password Reset Successful',
        content:
          'Hi {{firstName}},\n\nYour password has been successfully reset. You can now log in with your new password.\n\nIf you did not make this change, please contact our support team immediately.',
        ctaText: 'Log In',
        ctaRelativePath: '/auth/login',
        variables: ['firstName'],
      },
      {
        templateKey: 'NEW_LOGIN_DETECTED',
        name: 'New Login Detected',
        subject: 'New login to your account',
        title: 'New Login Detected',
        content:
          'Hi {{firstName}},\n\nA new login to your account was detected.\n\nDevice: {{deviceInfo}}\nLocation: {{location}}\nTime: {{loginTime}}\n\nIf this was not you, please secure your account immediately.',
        ctaText: 'Secure My Account',
        ctaRelativePath: '/auth/forgot-password',
        variables: ['firstName', 'deviceInfo', 'location', 'loginTime'],
      },
      // === Candidate Notifications ===
      {
        templateKey: 'JOB_APPLICATION_CONFIRMATION',
        name: 'Job Application Confirmation',
        subject: 'Application submitted for {{jobTitle}} at {{companyName}}',
        title: 'Application Submitted!',
        content:
          'Hi {{firstName}},\n\nYour application for {{jobTitle}} at {{companyName}} has been submitted successfully.\n\nThe employer will review your application and get back to you soon. You can track your application status from your dashboard.',
        ctaText: 'View Applications',
        ctaRelativePath: '/my-applications',
        variables: ['firstName', 'jobTitle', 'companyName'],
      },
      {
        templateKey: 'APPLICATION_STATUS_UPDATE',
        name: 'Application Status Update',
        subject: 'Update on your application for {{jobTitle}}',
        title: 'Application Status Update',
        content:
          'Hi {{firstName}},\n\nYour application for {{jobTitle}} at {{companyName}} has been updated to: {{status}}.\n\nLog in to your dashboard for more details.',
        ctaText: 'View Details',
        ctaRelativePath: '/my-applications',
        variables: ['firstName', 'jobTitle', 'companyName', 'status'],
      },
      {
        templateKey: 'INTERVIEW_SCHEDULED',
        name: 'Interview Scheduled',
        subject: 'Interview scheduled for {{jobTitle}} at {{companyName}}',
        title: 'Interview Scheduled',
        content:
          'Hi {{firstName}},\n\nAn interview has been scheduled for the position of {{jobTitle}} at {{companyName}}.\n\nDate & Time: {{interviewDate}}\n\nPlease be prepared and join on time. Good luck!',
        ctaText: 'View Interview Details',
        ctaRelativePath: '/my-applications',
        variables: ['firstName', 'jobTitle', 'companyName', 'interviewDate'],
      },
      {
        templateKey: 'INTERVIEW_REMINDER',
        name: 'Interview Reminder',
        subject: 'Reminder: Interview for {{jobTitle}} is coming up',
        title: 'Interview Reminder',
        content:
          'Hi {{firstName}},\n\nThis is a reminder that your interview for {{jobTitle}} at {{companyName}} is scheduled for {{interviewDate}}.\n\nMake sure you are prepared and join on time.',
        ctaText: 'View Details',
        ctaRelativePath: '/my-applications',
        variables: ['firstName', 'jobTitle', 'companyName', 'interviewDate'],
      },
      {
        templateKey: 'JOB_OFFER_RECEIVED',
        name: 'Job Offer Received',
        subject: 'Congratulations! You have a job offer from {{companyName}}',
        title: 'Job Offer Received!',
        content:
          'Hi {{firstName}},\n\nCongratulations! You have received a job offer for the position of {{jobTitle}} at {{companyName}}.\n\nPlease review the offer details and respond at your earliest convenience.',
        ctaText: 'View Offer',
        ctaRelativePath: '/my-applications',
        variables: ['firstName', 'jobTitle', 'companyName'],
      },
      {
        templateKey: 'JOB_ALERT_AI_MATCH',
        name: 'AI Job Match Alert',
        subject: 'New jobs matching your profile',
        title: 'Jobs That Match Your Profile',
        content:
          'Hi {{firstName}},\n\nWe found new job opportunities that match your skills and preferences.\n\nCheck them out and apply before they close!',
        ctaText: 'View Matching Jobs',
        ctaRelativePath: '/jobs/search',
        variables: ['firstName'],
      },
      {
        templateKey: 'PROFILE_COMPLETION_REMINDER',
        name: 'Profile Completion Reminder',
        subject: 'Complete your profile to get more job matches',
        title: 'Complete Your Profile',
        content:
          'Hi {{firstName}},\n\nYour profile is incomplete. Completing your profile increases your chances of getting matched with the right opportunities.\n\nTake a few minutes to fill in the missing details.',
        ctaText: 'Complete Profile',
        ctaRelativePath: '/profile',
        variables: ['firstName'],
      },
      // === Employer Notifications ===
      {
        templateKey: 'COMPANY_VERIFICATION_RESULT',
        name: 'Company Verification Result',
        subject: 'Company verification update: {{companyName}}',
        title: 'Company Verification {{status}}',
        content:
          'Hi {{firstName}},\n\nYour company verification for {{companyName}} has been {{status}}.\n\n{{message}}',
        ctaText: 'View Details',
        ctaRelativePath: '/employee/profile',
        variables: ['firstName', 'companyName', 'status', 'message'],
      },
      {
        templateKey: 'NEW_CANDIDATE_APPLICATION',
        name: 'New Candidate Application',
        subject: 'New application received for {{jobTitle}}',
        title: 'New Application Received',
        content:
          'Hi {{firstName}},\n\n{{candidateName}} has applied for the position of {{jobTitle}}.\n\nReview their application and take action.',
        ctaText: 'Review Application',
        ctaRelativePath: '/employee/all-applications',
        variables: ['firstName', 'candidateName', 'jobTitle'],
      },
      {
        templateKey: 'AI_CANDIDATE_RECOMMENDATIONS',
        name: 'AI Candidate Recommendations',
        subject: 'AI-recommended candidates for {{jobTitle}}',
        title: 'Recommended Candidates',
        content:
          'Hi {{firstName}},\n\nOur AI has found candidates that are a great match for your job posting: {{jobTitle}}.\n\nReview the recommendations and reach out to the best talent.',
        ctaText: 'View Candidates',
        ctaRelativePath: '/employee/all-applications',
        variables: ['firstName', 'jobTitle'],
      },
      {
        templateKey: 'INTERVIEW_RESPONSE_NOTIFICATION',
        name: 'Interview Response Notification',
        subject: '{{candidateName}} responded to interview for {{jobTitle}}',
        title: 'Interview Response',
        content:
          'Hi {{firstName}},\n\n{{candidateName}} has {{response}} the interview invitation for the position of {{jobTitle}}.\n\nPlease check the details and take next steps.',
        ctaText: 'View Details',
        ctaRelativePath: '/employee/interviews',
        variables: ['firstName', 'candidateName', 'jobTitle', 'response'],
      },
      {
        templateKey: 'JOB_POST_EXPIRING_SOON',
        name: 'Job Post Expiring Soon',
        subject: 'Your job posting "{{jobTitle}}" is expiring soon',
        title: 'Job Post Expiring Soon',
        content:
          'Hi {{firstName}},\n\nYour job posting for {{jobTitle}} will expire on {{expiryDate}}.\n\nIf you still need to fill this position, consider extending or reposting it.',
        ctaText: 'Manage Job Post',
        ctaRelativePath: '/employee/jobs',
        variables: ['firstName', 'jobTitle', 'expiryDate'],
      },
      // === Billing ===
      {
        templateKey: 'SUBSCRIPTION_STARTED',
        name: 'Subscription Started',
        subject: 'Your {{planName}} subscription is active',
        title: 'Subscription Activated',
        content:
          'Hi {{firstName}},\n\nYour {{planName}} subscription has been successfully activated. You now have access to all the features included in your plan.\n\nThank you for your purchase!',
        ctaText: 'View Subscription',
        ctaRelativePath: '/employee/plans/history',
        variables: ['firstName', 'planName'],
      },
      {
        templateKey: 'PAYMENT_RECEIPT',
        name: 'Payment Receipt',
        subject: 'Payment receipt for {{planName}}',
        title: 'Payment Received',
        content:
          'Hi {{firstName}},\n\nWe have received your payment of {{amount}} for the {{planName}} plan.\n\nTransaction ID: {{transactionId}}\nDate: {{paymentDate}}\n\nThank you!',
        ctaText: 'View Receipt',
        ctaRelativePath: '/employee/plans/history',
        variables: ['firstName', 'planName', 'amount', 'transactionId', 'paymentDate'],
      },
      {
        templateKey: 'PAYMENT_FAILED',
        name: 'Payment Failed',
        subject: 'Payment failed for your subscription',
        title: 'Payment Failed',
        content:
          'Hi {{firstName}},\n\nWe were unable to process your payment of {{amount}} for the {{planName}} plan.\n\nPlease update your payment method to avoid service interruption.',
        ctaText: 'Update Payment Method',
        ctaRelativePath: '/employee/plans',
        variables: ['firstName', 'planName', 'amount'],
      },
      {
        templateKey: 'SUBSCRIPTION_CANCELLED',
        name: 'Subscription Cancelled',
        subject: 'Your subscription has been cancelled',
        title: 'Subscription Cancelled',
        content:
          "Hi {{firstName}},\n\nYour {{planName}} subscription has been cancelled. You will continue to have access until {{endDate}}.\n\nWe'd love to have you back anytime.",
        ctaText: 'Resubscribe',
        ctaRelativePath: '/employee/plans',
        variables: ['firstName', 'planName', 'endDate'],
      },
      // === Platform ===
      {
        templateKey: 'ACCOUNT_APPROVED',
        name: 'Account Approved',
        subject: 'Your account has been approved',
        title: 'Account Approved',
        content:
          'Hi {{firstName}},\n\nYour account has been approved. You can now access all the features of {{platformName}}.\n\nWelcome aboard!',
        ctaText: 'Go to Dashboard',
        ctaRelativePath: '/dashboard',
        variables: ['firstName', 'platformName'],
      },
      {
        templateKey: 'ACCOUNT_REJECTED',
        name: 'Account Rejected',
        subject: 'Your account registration update',
        title: 'Account Not Approved',
        content:
          'Hi {{firstName}},\n\nUnfortunately, your account registration could not be approved at this time.\n\nReason: {{reason}}\n\nIf you believe this is an error, please contact our support team.',
        ctaText: 'Contact Support',
        ctaRelativePath: '/contact-us',
        variables: ['firstName', 'reason'],
      },
      {
        templateKey: 'ACCOUNT_SUSPENDED',
        name: 'Account Suspended',
        subject: 'Your account has been suspended',
        title: 'Account Suspended',
        content:
          'Hi {{firstName}},\n\nYour account has been suspended due to: {{reason}}.\n\nIf you believe this is an error, please contact our support team.',
        ctaText: 'Contact Support',
        ctaRelativePath: '/contact-us',
        variables: ['firstName', 'reason'],
      },
      {
        templateKey: 'NEW_DIRECT_MESSAGE',
        name: 'New Direct Message',
        subject: 'You have a new message from {{senderName}}',
        title: 'New Message',
        content:
          'Hi {{firstName}},\n\n{{senderName}} sent you a message:\n\n"{{messagePreview}}"\n\nLog in to view and reply.',
        ctaText: 'View Message',
        ctaRelativePath: '/chat',
        variables: ['firstName', 'senderName', 'messagePreview'],
      },
      {
        templateKey: 'SYSTEM_MAINTENANCE_NOTICE',
        name: 'System Maintenance Notice',
        subject: 'Scheduled maintenance notice',
        title: 'Scheduled Maintenance',
        content:
          'Hi {{firstName}},\n\nWe will be performing scheduled maintenance on {{maintenanceDate}} from {{startTime}} to {{endTime}}.\n\nDuring this time, the platform may be temporarily unavailable. We apologize for any inconvenience.',
        logoEnabled: true,
        ctaEnabled: false,
        ctaText: null,
        ctaUrl: null,
        ctaRelativePath: null,
        variables: ['firstName', 'maintenanceDate', 'startTime', 'endTime'],
      },
      // === Application Withdrawn (Employer) ===
      {
        templateKey: 'APPLICATION_WITHDRAWN',
        name: 'Application Withdrawn',
        subject: '{{candidateName}} withdrew application for {{jobTitle}}',
        title: 'Application Withdrawn',
        content:
          'Hi {{firstName}},\n\n{{candidateName}} has withdrawn their application for the position of {{jobTitle}}.\n\nYou can view other applications from your dashboard.',
        ctaText: 'View Applications',
        ctaRelativePath: '/employee/all-applications',
        variables: ['firstName', 'candidateName', 'jobTitle'],
      },
      // === Employer Interview Emails ===
      {
        templateKey: 'EMPLOYER_INTERVIEW_SCHEDULED',
        name: 'Employer Interview Scheduled',
        subject: 'Interview scheduled with {{candidateName}} for {{jobTitle}}',
        title: 'Interview Scheduled',
        content:
          'Hi {{firstName}},\n\nAn interview has been scheduled with {{candidateName}} ({{candidateEmail}}) for the position of {{jobTitle}} at {{companyName}}.\n\nInterview Details:\nType: {{interviewType}}\nDate & Time: {{interviewDate}} ({{timezone}})\nDuration: {{duration}} minutes\nTool: {{interviewTool}}',
        ctaText: 'View Interviews',
        ctaRelativePath: '/employee/interviews',
        variables: [
          'firstName',
          'candidateName',
          'candidateEmail',
          'jobTitle',
          'companyName',
          'interviewDate',
          'duration',
          'interviewType',
          'interviewTool',
          'timezone',
          'meetingLink',
          'meetingPassword',
          'hostJoinUrl',
        ],
      },
      {
        templateKey: 'INTERVIEW_RESCHEDULED',
        name: 'Interview Rescheduled',
        subject: 'Interview for {{jobTitle}} has been rescheduled',
        title: 'Interview Rescheduled',
        content:
          'Hi {{firstName}},\n\nYour interview for {{jobTitle}} at {{companyName}} has been rescheduled.\n\nPrevious: {{oldInterviewDate}}\nNew: {{interviewDate}}\nDuration: {{duration}} minutes\n\nPlease update your calendar accordingly.',
        ctaText: 'View Details',
        ctaRelativePath: '/my-applications',
        variables: [
          'firstName',
          'jobTitle',
          'companyName',
          'oldInterviewDate',
          'interviewDate',
          'duration',
          'reason',
          'meetingLink',
        ],
      },
      {
        templateKey: 'EMPLOYER_INTERVIEW_RESCHEDULED',
        name: 'Employer Interview Rescheduled',
        subject: 'Interview with {{candidateName}} for {{jobTitle}} rescheduled',
        title: 'Interview Rescheduled',
        content:
          'Hi {{firstName}},\n\nThe interview with {{candidateName}} for {{jobTitle}} has been rescheduled.\n\nPrevious: {{oldInterviewDate}}\nNew: {{interviewDate}}\nDuration: {{duration}} minutes',
        ctaText: 'View Details',
        ctaRelativePath: '/employee/interviews',
        variables: [
          'firstName',
          'candidateName',
          'jobTitle',
          'oldInterviewDate',
          'interviewDate',
          'duration',
          'reason',
          'meetingLink',
          'hostJoinUrl',
        ],
      },
      {
        templateKey: 'INTERVIEW_CANCELLED',
        name: 'Interview Cancelled',
        subject: 'Interview for {{jobTitle}} has been cancelled',
        title: 'Interview Cancelled',
        content:
          'Hi {{firstName}},\n\nYour interview for {{jobTitle}} at {{companyName}} scheduled for {{interviewDate}} has been cancelled.\n\nReason: {{reason}}\n\nWe apologize for any inconvenience.',
        ctaEnabled: false,
        ctaText: null,
        ctaUrl: null,
        ctaRelativePath: null,
        variables: ['firstName', 'jobTitle', 'companyName', 'interviewDate', 'reason'],
      },
      {
        templateKey: 'EMPLOYER_INTERVIEW_CANCELLED',
        name: 'Employer Interview Cancelled',
        subject: 'Interview with {{candidateName}} for {{jobTitle}} cancelled',
        title: 'Interview Cancelled',
        content:
          'Hi {{firstName}},\n\nThe interview with {{candidateName}} for {{jobTitle}} scheduled for {{interviewDate}} has been cancelled.\n\nReason: {{reason}}',
        ctaEnabled: false,
        ctaText: null,
        ctaUrl: null,
        ctaRelativePath: null,
        variables: ['firstName', 'candidateName', 'jobTitle', 'interviewDate', 'reason'],
      },
      // === Offer Emails (Employer Side) ===
      {
        templateKey: 'OFFER_ACCEPTED_EMPLOYER',
        name: 'Offer Accepted - Employer',
        subject: '{{candidateName}} accepted the offer for {{jobTitle}}',
        title: 'Offer Accepted!',
        content:
          'Hi {{firstName}},\n\nGreat news! {{candidateName}} has accepted the job offer for the position of {{jobTitle}}.\n\nPlease proceed with the onboarding process.',
        ctaText: 'View Details',
        ctaRelativePath: '/employee/all-applications',
        variables: ['firstName', 'candidateName', 'jobTitle'],
      },
      {
        templateKey: 'OFFER_DECLINED_EMPLOYER',
        name: 'Offer Declined - Employer',
        subject: '{{candidateName}} declined the offer for {{jobTitle}}',
        title: 'Offer Declined',
        content:
          'Hi {{firstName}},\n\n{{candidateName}} has declined the job offer for the position of {{jobTitle}}.\n\nReason: {{reason}}\n\nYou may want to consider other candidates for this position.',
        ctaText: 'View Candidates',
        ctaRelativePath: '/employee/all-applications',
        variables: ['firstName', 'candidateName', 'jobTitle', 'reason'],
      },
      {
        templateKey: 'OFFER_WITHDRAWN_CANDIDATE',
        name: 'Offer Withdrawn - Candidate',
        subject: 'Job offer for {{jobTitle}} at {{companyName}} has been withdrawn',
        title: 'Offer Withdrawn',
        content:
          'Hi {{firstName}},\n\nWe regret to inform you that the job offer for the position of {{jobTitle}} at {{companyName}} has been withdrawn.\n\nIf you have any questions, please contact our support team.',
        ctaText: 'Contact Support',
        ctaRelativePath: '/contact-us',
        variables: ['firstName', 'jobTitle', 'companyName'],
      },
      // === Job Posted Confirmation ===
      {
        templateKey: 'JOB_POSTED_CONFIRMATION',
        name: 'Job Posted Confirmation',
        subject: 'Your job listing "{{jobTitle}}" is now live',
        title: 'Job Posted Successfully!',
        content:
          'Hi {{firstName}},\n\nYour job listing for {{jobTitle}} has been published and is now visible to candidates.\n\nYou can manage your job posting from the dashboard.',
        ctaText: 'View Job Posting',
        ctaRelativePath: '/employee/jobs',
        variables: ['firstName', 'jobTitle'],
      },
    ];
  }
}
