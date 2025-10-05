import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly smtpTransporter: nodemailer.Transporter;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly templates: Map<string, HandlebarsTemplateDelegate>;

  constructor(private readonly configService: ConfigService) {
    // Initialize Resend
    const resendApiKey = this.configService.get<string>('app.email.resendApiKey');
    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
    }

    // Initialize Gmail SMTP as fallback
    const smtpConfig = this.configService.get('app.smtp');
    if (smtpConfig?.user && smtpConfig?.pass) {
      this.smtpTransporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.pass,
        },
      });
    }

    this.fromEmail = this.configService.get<string>('app.email.fromEmail');
    this.fromName = this.configService.get<string>('app.email.fromName');

    // Load email templates
    this.templates = new Map();
    this.loadTemplates();
  }

  /**
   * Load all email templates
   */
  private loadTemplates() {
    const templatesDir = path.join(__dirname, '..', 'templates');
    const templateFiles = [
      'welcome',
      'email-verification',
      'password-reset',
      'login-alert',
      'account-locked',
      '2fa-enabled',
    ];

    for (const templateName of templateFiles) {
      try {
        const templatePath = path.join(templatesDir, `${templateName}.hbs`);
        const templateSource = fs.readFileSync(templatePath, 'utf-8');
        this.templates.set(templateName, Handlebars.compile(templateSource));
      } catch (error) {
        this.logger.warn(`Failed to load template ${templateName}:`, error instanceof Error ? error.message : String(error));
      }
    }
  }

  /**
   * Send email using Resend or SMTP fallback
   */
  private async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      // Try Resend first
      if (this.resend) {
        const { data, error } = await this.resend.emails.send({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: [to],
          subject,
          html,
        });

        if (error) {
          this.logger.error('Resend error:', error);
          throw new Error(error.message);
        }

        this.logger.log(`Email sent via Resend to ${to}: ${data.id}`);
        return true;
      }

      // Fallback to SMTP
      if (this.smtpTransporter) {
        await this.smtpTransporter.sendMail({
          from: `"${this.fromName}" <${this.fromEmail}>`,
          to,
          subject,
          html,
        });

        this.logger.log(`Email sent via SMTP to ${to}`);
        return true;
      }

      this.logger.error('No email service configured (Resend or SMTP)');
      return false;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error instanceof Error ? error.message : String(error));

      // Try SMTP fallback if Resend failed
      if (this.resend && this.smtpTransporter) {
        try {
          await this.smtpTransporter.sendMail({
            from: `"${this.fromName}" <${this.fromEmail}>`,
            to,
            subject,
            html,
          });

          this.logger.log(`Email sent via SMTP fallback to ${to}`);
          return true;
        } catch (smtpError) {
          this.logger.error(`SMTP fallback also failed:`, smtpError instanceof Error ? smtpError.message : String(smtpError));
        }
      }

      return false;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
    const template = this.templates.get('welcome');
    if (!template) {
      this.logger.error('Welcome template not found');
      return false;
    }

    const html = template({
      firstName,
      dashboardUrl: `${this.configService.get('app.frontend.url')}/dashboard`,
    });

    return this.sendEmail(email, 'Welcome to AI Job Portal', html);
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(email: string, firstName: string, token: string): Promise<boolean> {
    const template = this.templates.get('email-verification');
    if (!template) {
      this.logger.error('Email verification template not found');
      return false;
    }

    const verificationUrl = `${this.configService.get('app.frontend.emailVerificationUrl')}?token=${token}`;

    const html = template({
      firstName,
      verificationUrl,
    });

    return this.sendEmail(email, 'Verify Your Email Address', html);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, firstName: string, token: string): Promise<boolean> {
    const template = this.templates.get('password-reset');
    if (!template) {
      this.logger.error('Password reset template not found');
      return false;
    }

    const resetUrl = `${this.configService.get('app.frontend.passwordResetUrl')}?token=${token}`;

    const html = template({
      firstName,
      resetUrl,
    });

    return this.sendEmail(email, 'Reset Your Password', html);
  }

  /**
   * Send login alert
   */
  async sendLoginAlert(
    email: string,
    firstName: string,
    loginDetails: {
      loginTime: string;
      location: string;
      ipAddress: string;
      device: string;
      browser: string;
    },
  ): Promise<boolean> {
    const template = this.templates.get('login-alert');
    if (!template) {
      this.logger.error('Login alert template not found');
      return false;
    }

    const frontendUrl = this.configService.get('app.frontend.url');

    const html = template({
      firstName,
      ...loginDetails,
      changePasswordUrl: `${frontendUrl}/settings/password`,
      sessionsUrl: `${frontendUrl}/settings/sessions`,
    });

    return this.sendEmail(email, 'New Login to Your Account', html);
  }

  /**
   * Send account locked email
   */
  async sendAccountLockedEmail(
    email: string,
    firstName: string,
    lockDetails: {
      attemptCount: number;
      lockTime: string;
      unlockTime: string;
      ipAddress: string;
    },
  ): Promise<boolean> {
    const template = this.templates.get('account-locked');
    if (!template) {
      this.logger.error('Account locked template not found');
      return false;
    }

    const frontendUrl = this.configService.get('app.frontend.url');

    const html = template({
      firstName,
      ...lockDetails,
      unlockUrl: `${frontendUrl}/unlock-account`,
      resetPasswordUrl: `${frontendUrl}/reset-password`,
    });

    return this.sendEmail(email, 'Account Temporarily Locked - Security Alert', html);
  }

  /**
   * Send 2FA enabled confirmation
   */
  async send2FAEnabledEmail(
    email: string,
    firstName: string,
    enabledDetails: {
      enabledAt: string;
      device: string;
      ipAddress: string;
    },
  ): Promise<boolean> {
    const template = this.templates.get('2fa-enabled');
    if (!template) {
      this.logger.error('2FA enabled template not found');
      return false;
    }

    const frontendUrl = this.configService.get('app.frontend.url');

    const html = template({
      firstName,
      ...enabledDetails,
      securitySettingsUrl: `${frontendUrl}/settings/security`,
    });

    return this.sendEmail(email, 'Two-Factor Authentication Enabled', html);
  }
}
