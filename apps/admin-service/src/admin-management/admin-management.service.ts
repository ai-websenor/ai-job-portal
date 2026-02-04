import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { Database, users, roles, userRoles } from '@ai-job-portal/database';
import { CognitoService, SesService } from '@ai-job-portal/aws';
import { RoleManagementService } from '@ai-job-portal/common';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateAdminDto } from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminManagementService {
  private readonly logger = new Logger(AdminManagementService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly cognitoService: CognitoService,
    private readonly sesService: SesService,
    private readonly roleManagementService: RoleManagementService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new admin user
   * - Registers with Cognito
   * - Creates user with 'admin' role
   * - Grants ADMIN RBAC role
   * - Sends credentials email (production only)
   */
  async createAdmin(creatorId: string, dto: CreateAdminDto) {
    this.logger.log(`Creating admin: ${dto.email}`);

    try {
      // Validate passwords match
      if (dto.password !== dto.confirmPassword) {
        throw new BadRequestException('Passwords do not match');
      }

      // Check if email already exists
      const existingUser = await this.db.query.users.findFirst({
        where: eq(users.email, dto.email.toLowerCase()),
      });

      if (existingUser) {
        throw new ConflictException('Email already registered');
      }

      // Register with Cognito
      this.logger.log('Registering admin with Cognito...');
      const cognitoResult = await this.cognitoService.signUp(dto.email, dto.password, {
        givenName: dto.firstName,
        familyName: dto.lastName,
      });

      // Admin-confirm the user in Cognito
      this.logger.log('Admin-confirming user in Cognito...');
      await this.cognitoService.adminConfirmSignUp(dto.email);

      // Hash password for database storage (for admin panel login)
      this.logger.log('Hashing password...');
      const hashedPassword = await bcrypt.hash(dto.password, 10);

      // Create user in database with 'admin' role
      this.logger.log('Creating user in database...');
      const [user] = await this.db
        .insert(users)
        .values({
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email.toLowerCase(),
          password: hashedPassword, // Store hashed password for admin panel login
          mobile: '+910000000000', // Placeholder
          role: 'admin', // User role (backward compatibility)
          cognitoSub: cognitoResult.userSub,
          isVerified: true,
          isMobileVerified: false,
          isActive: true,
          isAdmin: true, // Quick identifier flag
          onboardingStep: 0,
          isOnboardingCompleted: true,
        })
        .returning();

      this.logger.log(`User created with ID: ${user.id}`);

      // Grant ADMIN role via RBAC
      this.logger.log('Granting ADMIN role via RBAC...');
      const [adminRole] = await this.db
        .select()
        .from(roles)
        .where(eq(roles.name, 'ADMIN'))
        .limit(1);

      if (adminRole) {
        await this.roleManagementService.grantRole(creatorId, user.id, adminRole.id);
        this.logger.log('ADMIN role granted successfully');
      } else {
        this.logger.warn('ADMIN role not found in database. Skipping RBAC grant.');
      }

      // Send credentials email (production only)
      const isProduction = this.configService.get('NODE_ENV') === 'production';
      if (isProduction) {
        await this.sendCredentialsEmail(dto.email, dto.firstName, dto.password);
      } else {
        this.logger.log('[DEV] Skipping credentials email (production only)');
      }

      return {
        data: {
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        message: 'Admin created successfully',
      };
    } catch (error: any) {
      this.logger.error(`Error creating admin: ${error.message}`);

      // Handle Cognito-specific errors
      if (error.name === 'UsernameExistsException') {
        throw new ConflictException('Email already registered in authentication system');
      }
      if (error.name === 'InvalidPasswordException') {
        throw new BadRequestException(
          'Password does not meet requirements. Must have at least 8 characters, uppercase, lowercase, number, and special character.',
        );
      }

      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * Send credentials email to new admin
   */
  private async sendCredentialsEmail(email: string, name: string, password: string) {
    try {
      const loginUrl = this.configService.get('ADMIN_PANEL_URL') || 'http://localhost:8080/login';

      const subject = 'Welcome to AI Job Portal - Admin Access Granted';
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; margin-top: 20px; }
            .credentials { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #4F46E5; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Admin Access Granted</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${name}</strong>,</p>
              <p>Your administrator account has been created for the AI Job Portal admin panel.</p>

              <div class="credentials">
                <h3>Your Login Credentials</h3>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Password:</strong> ${password}</p>
                <p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
              </div>

              <p><strong>⚠️ Security Reminder:</strong> Please change your password after your first login for security purposes.</p>

              <a href="${loginUrl}" class="button">Login to Admin Panel</a>

              <p style="margin-top: 30px;">If you have any questions or need assistance, please contact the system administrator.</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
              <p>&copy; 2026 AI Job Portal. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.sesService.sendEmail({
        to: email,
        subject,
        html,
      });

      this.logger.log(`Credentials email sent to: ${email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send credentials email: ${error.message}`);
      // Don't throw error - admin creation should succeed even if email fails
    }
  }
}
