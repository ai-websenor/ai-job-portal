/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, or, ilike, desc, sql } from 'drizzle-orm';
import { Database, users, employers, sessions, companies } from '@ai-job-portal/database';
import { CognitoService } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateEmployerDto, ListEmployersDto, UpdateEmployerDto, EmployerResponseDto } from './dto';

@Injectable()
export class EmployerManagementService {
  private readonly logger = new Logger(EmployerManagementService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly cognitoService: CognitoService,
  ) {}

  /**
   * Create a new employer (Admin action)
   * - Registers user with AWS Cognito (same flow as /api/v1/auth/register)
   * - Auto-confirms user in Cognito (admin bypass - no email verification needed)
   * - Creates user with role 'employer'
   * - Auto-assigns employer to admin's company
   * - Creates employer profile
   * - Does NOT auto-login employer
   */
  async createEmployer(adminId: string, companyId: string, dto: CreateEmployerDto) {
    this.logger.log(`Admin ${adminId} creating employer: ${dto.email} for company: ${companyId}`);
    this.logger.warn(
      `DEBUG - Received companyId: ${companyId} (type: ${typeof companyId}, isNull: ${companyId === null}, isUndefined: ${companyId === undefined})`,
    );

    try {
      // Validate passwords match
      if (dto.password !== dto.confirmPassword) {
        throw new BadRequestException('Passwords do not match');
      }

      // Validate company exists (for admins with company scope)
      if (companyId) {
        const company = await this.db.query.companies.findFirst({
          where: eq(companies.id, companyId),
        });
        if (!company) {
          throw new NotFoundException(`Company with ID ${companyId} not found`);
        }
      }

      // Check if email already exists in local DB
      this.logger.log('Checking if email exists...');
      const existingUser = await this.db.query.users.findFirst({
        where: eq(users.email, dto.email.toLowerCase()),
      });

      if (existingUser) {
        throw new ConflictException('Email already registered');
      }

      // Register with Cognito - handles password hashing and storage
      this.logger.log('Registering user with Cognito...');
      const cognitoResult = await this.cognitoService.signUp(dto.email, dto.password, {
        givenName: dto.firstName,
        familyName: dto.lastName,
        phoneNumber: dto.mobile,
      });

      this.logger.log(`Cognito user created with sub: ${cognitoResult.userSub}`);

      // Admin-confirm the user in Cognito (bypasses email verification)
      this.logger.log('Admin-confirming user in Cognito (bypass email verification)...');
      await this.cognitoService.adminConfirmSignUp(dto.email);

      // Create user in local database (empty password - Cognito handles auth)
      this.logger.log('Creating user in local database...');
      const [user] = await this.db
        .insert(users)
        .values({
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email.toLowerCase(),
          password: '', // Empty - Cognito handles passwords
          mobile: dto.mobile,
          role: 'employer',
          companyId: companyId || null, // Auto-assign employer to admin's company
          cognitoSub: cognitoResult.userSub, // Store Cognito user ID
          isVerified: true, // Admin-created employers are pre-verified
          isMobileVerified: false,
          isActive: true,
          onboardingStep: 0,
          isOnboardingCompleted: false,
        } as any)
        .returning();

      this.logger.log(`User created with ID: ${user.id}`);

      // Create employer profile
      this.logger.log('Creating employer profile...');
      const [employer] = await this.db
        .insert(employers)
        .values({
          userId: user.id,
          companyId: companyId || null, // Auto-assign employer profile to admin's company
          isVerified: false,
          subscriptionPlan: 'free',
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email.toLowerCase(),
          phone: dto.mobile,
          visibility: true,
          designation: dto.designation,
          department: dto.department,
        })
        .returning();

      this.logger.log(`Employer profile created with ID: ${employer.id}`);

      // Log audit
      await this.logAudit(adminId, 'create_employer', {
        userId: user.id,
        employerId: employer.id,
        email: dto.email,
        companyId: companyId, // Track company assignment
      });

      this.logger.log(`Employer created successfully: ${user.id}`);

      return {
        data: {
          userId: user.id,
          employerId: employer.id,
        },
        message: 'Employer created successfully',
      };
    } catch (error: any) {
      this.logger.error(`Error creating employer: ${error.message}`);
      this.logger.error(`Error name: ${error.name}`);
      this.logger.error(`Error stack: ${error.stack}`);

      // Handle Cognito-specific errors
      if (error.name === 'UsernameExistsException') {
        throw new ConflictException('Email already registered in authentication system');
      }
      if (error.name === 'InvalidPasswordException') {
        throw new BadRequestException(
          'Password does not meet requirements. Must have at least 8 characters, uppercase, lowercase, number, and special character.',
        );
      }
      if (error.name === 'InvalidParameterException') {
        throw new BadRequestException(`Invalid parameter: ${error.message}`);
      }

      // Unwrap AggregateError to see underlying errors
      if (error.name === 'AggregateError' && error.errors) {
        this.logger.error('AggregateError contains multiple errors:');
        error.errors.forEach((e: any, index: number) => {
          this.logger.error(`Error ${index + 1}: ${e.message}`);
          this.logger.error(`Error ${index + 1} stack: ${e.stack}`);
        });
        // Throw the first underlying error for better debugging
        if (error.errors.length > 0) {
          const firstError = error.errors[0];
          throw new BadRequestException(`Database error: ${firstError.message}`);
        }
      }

      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * List all employers with pagination and filtering
   */
  async listEmployers(companyId: string | null, dto: ListEmployersDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const offset = (page - 1) * limit;

    try {
      // Build conditions for users table
      const conditions: any[] = [eq(users.role, 'employer')];

      // Company scoping for admin users (super_admin sees all)
      if (companyId) {
        conditions.push(eq((users as any).companyId, companyId));
        this.logger.log(`Filtering employers by company: ${companyId}`);
      }

      if (dto.status) {
        conditions.push(eq(users.isActive, dto.status === 'active'));
      }

      if (dto.search && dto.search.trim()) {
        const searchTerm = `%${dto.search.trim()}%`;
        conditions.push(
          or(
            ilike(users.email, searchTerm),
            ilike(users.firstName, searchTerm),
            ilike(users.lastName, searchTerm),
          ),
        );
      }

      const whereClause = and(...conditions);

      // Fetch employers - simpler query without nested relations
      const [employerResults, countResult] = await Promise.all([
        this.db.query.employers.findMany({
          orderBy: [desc(employers.createdAt)],
          limit,
          offset,
          with: {
            user: {
              columns: {
                password: false,
              },
            },
            company: true,
          },
        }),
        this.db.select({ count: sql<number>`count(*)` }).from(employers),
      ]);

      const total = Number(countResult[0]?.count || 0);

      // Map and filter results
      let items = employerResults
        .filter((emp: any) => {
          // Apply user-level filters
          const user = emp.user;
          if (!user) return false;

          // Role filter (should be employer)
          if (user.role !== 'employer') return false;

          // Status filter
          if (dto.status && user.isActive !== (dto.status === 'active')) return false;

          // Search filter
          if (dto.search && dto.search.trim()) {
            const searchLower = dto.search.toLowerCase().trim();
            const matchEmail = user.email?.toLowerCase().includes(searchLower);
            const matchFirstName = user.firstName?.toLowerCase().includes(searchLower);
            const matchLastName = user.lastName?.toLowerCase().includes(searchLower);
            if (!matchEmail && !matchFirstName && !matchLastName) return false;
          }

          return true;
        })
        .map((emp: any) => this.mapEmployerToResponse(emp));

      // Filter by isVerified if specified
      if (dto.isVerified !== undefined) {
        items = items.filter((item) => item.isVerified === dto.isVerified);
      }

      const totalPages = Math.ceil(total / limit);

      return {
        data: items,
        message: 'Employers fetched successfully',
        pagination: {
          totalEmployers: total,
          pageCount: totalPages,
          currentPage: page,
          hasNextPage: page < totalPages,
        },
      };
    } catch (error) {
      this.logger.error('Error listing employers:', error);
      throw error;
    }
  }

  /**
   * Get employer details by ID
   * Company-scoped: Admin can only view employers from their assigned company
   */
  async getEmployer(companyId: string | null, employerId: string) {
    try {
      // First try to find by employer ID
      let employer = await this.db.query.employers.findFirst({
        where: eq(employers.id, employerId),
        with: {
          user: {
            columns: {
              password: false,
            },
          },
          company: true,
        },
      });

      // If not found, try by user ID
      if (!employer) {
        employer = await this.db.query.employers.findFirst({
          where: eq(employers.userId, employerId),
          with: {
            user: {
              columns: {
                password: false,
              },
            },
            company: true,
          },
        });
      }

      if (!employer) {
        throw new NotFoundException('Employer not found');
      }

      // Company scope validation for admin users
      if (companyId && (employer.user as any)?.companyId !== companyId) {
        throw new ForbiddenException('You can only access employers from your assigned company');
      }

      return {
        data: this.mapEmployerToResponse(employer),
        message: 'Employer fetched successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error('Error getting employer:', error);
      throw error;
    }
  }

  /**
   * Update employer (Admin action)
   * Company-scoped: Admin can only update employers from their assigned company
   */
  async updateEmployer(
    adminId: string,
    companyId: string | null,
    employerId: string,
    dto: UpdateEmployerDto,
  ) {
    this.logger.log(`Admin ${adminId} updating employer: ${employerId}`);

    try {
      // Find employer
      let employer = await this.db.query.employers.findFirst({
        where: eq(employers.id, employerId),
        with: {
          user: true,
        },
      });

      // Try by user ID if not found
      if (!employer) {
        employer = await this.db.query.employers.findFirst({
          where: eq(employers.userId, employerId),
          with: {
            user: true,
          },
        });
      }

      if (!employer) {
        throw new NotFoundException('Employer not found');
      }

      const user = employer.user as any;
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Company scope validation for admin users
      if (companyId && user.companyId !== companyId) {
        throw new ForbiddenException('You can only update employers from your assigned company');
      }

      // If email is being changed, check uniqueness
      if (dto.email && dto.email.toLowerCase() !== user.email) {
        const existingUser = await this.db.query.users.findFirst({
          where: eq(users.email, dto.email.toLowerCase()),
        });

        if (existingUser) {
          throw new ConflictException('Email already in use');
        }
      }

      // Update user table
      const userUpdates: any = { updatedAt: new Date() };
      if (dto.firstName) userUpdates.firstName = dto.firstName;
      if (dto.lastName) userUpdates.lastName = dto.lastName;
      if (dto.email) userUpdates.email = dto.email.toLowerCase();
      if (dto.mobile) userUpdates.mobile = dto.mobile;
      if (dto.isActive !== undefined) userUpdates.isActive = dto.isActive;

      await this.db.update(users).set(userUpdates).where(eq(users.id, employer.userId));

      // Update employer table
      const employerUpdates: any = { updatedAt: new Date() };
      if (dto.firstName) employerUpdates.firstName = dto.firstName;
      if (dto.lastName) employerUpdates.lastName = dto.lastName;
      if (dto.email) employerUpdates.email = dto.email.toLowerCase();
      if (dto.mobile) employerUpdates.phone = dto.mobile;
      if (dto.designation) employerUpdates.designation = dto.designation;
      if (dto.department) employerUpdates.department = dto.department;
      if (dto.isVerified !== undefined) employerUpdates.isVerified = dto.isVerified;

      await this.db.update(employers).set(employerUpdates).where(eq(employers.id, employer.id));

      // Log audit
      await this.logAudit(adminId, 'update_employer', {
        employerId: employer.id,
        userId: employer.userId,
        changes: dto,
      });

      // Get updated employer
      const updatedEmployer = await this.db.query.employers.findFirst({
        where: eq(employers.id, employer.id),
        with: {
          user: {
            columns: {
              password: false,
            },
          },
          company: true,
        },
      });

      return {
        data: this.mapEmployerToResponse(updatedEmployer),
        message: 'Employer updated successfully',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Error updating employer:', error);
      throw error;
    }
  }

  /**
   * Delete employer (Admin action)
   * - Soft delete: deactivates user and invalidates sessions
   * - Preserves historical data
   */
  /**
   * Delete/deactivate employer (Admin action)
   * Company-scoped: Admin can only delete employers from their assigned company
   */
  async deleteEmployer(
    adminId: string,
    companyId: string | null,
    employerId: string,
    reason?: string,
  ) {
    this.logger.log(`Admin ${adminId} deleting employer: ${employerId}`);

    try {
      // Find employer with user info for company validation
      let employer = await this.db.query.employers.findFirst({
        where: eq(employers.id, employerId),
        with: {
          user: true,
        },
      });

      // Try by user ID if not found
      if (!employer) {
        employer = await this.db.query.employers.findFirst({
          where: eq(employers.userId, employerId),
          with: {
            user: true,
          },
        });
      }

      if (!employer) {
        throw new NotFoundException('Employer not found');
      }

      // Company scope validation for admin users
      if (companyId && (employer.user as any)?.companyId !== companyId) {
        throw new ForbiddenException('You can only delete employers from your assigned company');
      }

      // Soft delete: Mark user as inactive and anonymize email
      await this.db
        .update(users)
        .set({
          isActive: false,
          email: `deleted_${Date.now()}_${employer.userId}@deleted.local`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, employer.userId));

      // Invalidate all sessions for this user
      await this.db.delete(sessions).where(eq(sessions.userId, employer.userId));

      // Log audit
      await this.logAudit(adminId, 'delete_employer', {
        employerId: employer.id,
        userId: employer.userId,
        reason,
      });

      this.logger.log(`Employer soft-deleted: ${employer.id}`);

      return {
        data: {
          employerId: employer.id,
          userId: employer.userId,
        },
        message: 'Employer deactivated successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error('Error deleting employer:', error);
      throw error;
    }
  }

  /**
   * Map user and employer data to response DTO (from user with employer relation)
   */
  private mapToEmployerResponse(user: any): EmployerResponseDto {
    const employer = user.employer;
    const company = employer?.company;

    return {
      id: employer?.id || user.id,
      userId: user.id,
      firstName: user.firstName || employer?.firstName || '',
      lastName: user.lastName || employer?.lastName || '',
      email: user.email,
      mobile: user.mobile || employer?.phone || '',
      isActive: user.isActive,
      isVerified: employer?.isVerified || false,
      designation: employer?.designation,
      department: employer?.department,
      company: company
        ? {
            id: company.id,
            name: company.name,
            industry: company.industry,
          }
        : undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Map employer (with user relation) to response DTO
   */
  private mapEmployerToResponse(employer: any): EmployerResponseDto {
    const user = employer.user;
    const company = employer.company;

    return {
      id: employer.id,
      userId: employer.userId,
      firstName: user?.firstName || employer.firstName || '',
      lastName: user?.lastName || employer.lastName || '',
      email: user?.email || employer.email || '',
      mobile: user?.mobile || employer.phone || '',
      isActive: user?.isActive ?? true,
      isVerified: employer.isVerified || false,
      designation: employer.designation,
      department: employer.department,
      company: company
        ? {
            id: company.id,
            name: company.name,
            industry: company.industry,
          }
        : undefined,
      createdAt: employer.createdAt,
      updatedAt: employer.updatedAt,
    };
  }

  /**
   * Log admin action for audit trail
   */
  private async logAudit(adminId: string, action: string, details: Record<string, any>) {
    // TODO: Implement proper audit logging with valid companyId
    // The activityLogs table requires a valid company UUID which we don't have for admin actions
    // For now, just log to console
    this.logger.log(`Audit: ${action} by ${adminId}`, JSON.stringify(details));
  }
}
