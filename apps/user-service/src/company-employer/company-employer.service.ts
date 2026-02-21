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
import { eq, and, or, ilike, desc, asc, sql, gte, lte } from 'drizzle-orm';
import { Database, users, employers, sessions, companies } from '@ai-job-portal/database';
import { CognitoService } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import {
  CreateCompanyEmployerDto,
  ListCompanyEmployersDto,
  UpdateCompanyEmployerDto,
  CompanyEmployerResponseDto,
} from './dto';

@Injectable()
export class CompanyEmployerService {
  private readonly logger = new Logger(CompanyEmployerService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly cognitoService: CognitoService,
  ) {}

  /**
   * Resolve the companyId for the super_employer.
   * Checks users.companyId first, falls back to employers.companyId.
   */
  private async resolveCompanyId(
    superEmployerId: string,
    companyId: string | null,
  ): Promise<string> {
    if (companyId) {
      return companyId;
    }

    // Fallback: look up companyId from the super_employer's employer record
    const superEmployer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, superEmployerId),
      columns: { companyId: true },
    });

    if (superEmployer?.companyId) {
      this.logger.log(
        `Resolved companyId from employers table: ${superEmployer.companyId} for super_employer: ${superEmployerId}`,
      );
      return superEmployer.companyId;
    }

    throw new ForbiddenException(
      'No company assigned to your account. Contact super admin to assign a company.',
    );
  }

  /**
   * Create a new employer under the super_employer's company
   * - Registers user with AWS Cognito
   * - Auto-confirms user in Cognito (bypass email verification)
   * - Creates user with role 'employer'
   * - Auto-assigns employer to super_employer's company
   * - Creates employer profile
   * - Does NOT auto-login the new employer
   */
  async createEmployer(
    superEmployerId: string,
    companyId: string | null,
    dto: CreateCompanyEmployerDto,
  ) {
    // Resolve companyId: from header or fallback to employers table
    const resolvedCompanyId = await this.resolveCompanyId(superEmployerId, companyId);

    this.logger.log(
      `Super employer ${superEmployerId} creating employer: ${dto.email} for company: ${resolvedCompanyId}`,
    );

    try {
      // Validate passwords match
      if (dto.password !== dto.confirmPassword) {
        throw new BadRequestException('Passwords do not match');
      }

      // Validate company exists
      const company = await this.db.query.companies.findFirst({
        where: eq(companies.id, resolvedCompanyId),
      });
      if (!company) {
        throw new NotFoundException(`Company with ID ${resolvedCompanyId} not found`);
      }

      // Check if email already exists in local DB
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

      // Auto-confirm the user in Cognito (bypasses email verification)
      await this.cognitoService.adminConfirmSignUp(dto.email);

      // Create user in local database (empty password - Cognito handles auth)
      const [user] = await this.db
        .insert(users)
        .values({
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email.toLowerCase(),
          password: '', // Empty - Cognito handles passwords
          mobile: dto.mobile,
          role: 'employer',
          companyId: resolvedCompanyId,
          cognitoSub: cognitoResult.userSub,
          isVerified: true, // Super employer-created employers are pre-verified
          isMobileVerified: false,
          isActive: true,
          onboardingStep: 0,
          isOnboardingCompleted: false,
        } as any)
        .returning();

      this.logger.log(`User created with ID: ${user.id}`);

      // Create employer profile
      const [employer] = await this.db
        .insert(employers)
        .values({
          userId: user.id,
          companyId: resolvedCompanyId,
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
      await this.logAudit(superEmployerId, 'create_employer', {
        userId: user.id,
        employerId: employer.id,
        email: dto.email,
        companyId: resolvedCompanyId,
      });

      return {
        data: {
          userId: user.id,
          employerId: employer.id,
        },
        message: 'Employer created successfully',
      };
    } catch (error: any) {
      this.logger.error(`Error creating employer: ${error.message}`);

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

      if (error.name === 'AggregateError' && error.errors) {
        this.logger.error('AggregateError contains multiple errors:');
        error.errors.forEach((e: any, index: number) => {
          this.logger.error(`Error ${index + 1}: ${e.message}`);
        });
        if (error.errors.length > 0) {
          throw new BadRequestException(`Database error: ${error.errors[0].message}`);
        }
      }

      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * List all employers in the super_employer's company with pagination and filtering
   */
  async listEmployers(
    superEmployerId: string,
    companyId: string | null,
    dto: ListCompanyEmployersDto,
  ) {
    const resolvedCompanyId = await this.resolveCompanyId(superEmployerId, companyId);
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const offset = (page - 1) * limit;

    try {
      const conditions: any[] = [eq(users.role, 'employer')];

      // Company scoping: super_employer sees only their company's employers
      conditions.push(eq(users.companyId, resolvedCompanyId));

      if (dto.status) {
        conditions.push(eq(users.isActive, dto.status === 'active'));
      }

      if (dto.isVerified !== undefined) {
        conditions.push(eq(employers.isVerified, dto.isVerified));
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

      if (dto.fromDate) {
        const fromDate = new Date(dto.fromDate);
        fromDate.setHours(0, 0, 0, 0);
        conditions.push(gte(employers.createdAt, fromDate));
      }

      if (dto.toDate) {
        const toDate = new Date(dto.toDate);
        toDate.setHours(23, 59, 59, 999);
        conditions.push(lte(employers.createdAt, toDate));
      }

      const whereClause = and(...conditions);

      const sortBy = dto.sortBy || 'createdAt';
      const sortOrder = dto.sortOrder || 'desc';
      const orderByColumn = sortBy === 'createdAt' ? employers.createdAt : employers.createdAt;
      const orderByFn = sortOrder === 'asc' ? asc : desc;

      const [employerResults, countResult] = await Promise.all([
        this.db
          .select()
          .from(employers)
          .innerJoin(users, eq(employers.userId, users.id))
          .leftJoin(companies, eq(employers.companyId, companies.id))
          .where(whereClause)
          .orderBy(orderByFn(orderByColumn))
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: sql<number>`count(*)` })
          .from(employers)
          .innerJoin(users, eq(employers.userId, users.id))
          .where(whereClause),
      ]);

      const total = Number(countResult[0]?.count || 0);

      const items = employerResults.map((row: any) =>
        this.mapEmployerToResponse({
          ...row.employers,
          user: row.users,
          company: row.companies,
        }),
      );

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
   * Get employer details by ID (company-scoped)
   */
  async getEmployer(superEmployerId: string, companyId: string | null, employerId: string) {
    const resolvedCompanyId = await this.resolveCompanyId(superEmployerId, companyId);
    try {
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

      // Company scope validation
      if ((employer.user as any)?.companyId !== resolvedCompanyId) {
        throw new ForbiddenException('You can only access employers from your company');
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
   * Update employer details (company-scoped)
   */
  async updateEmployer(
    superEmployerId: string,
    companyId: string | null,
    employerId: string,
    dto: UpdateCompanyEmployerDto,
  ) {
    const resolvedCompanyId = await this.resolveCompanyId(superEmployerId, companyId);
    this.logger.log(`Super employer ${superEmployerId} updating employer: ${employerId}`);

    try {
      let employer = await this.db.query.employers.findFirst({
        where: eq(employers.id, employerId),
        with: {
          user: true,
        },
      });

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

      // Company scope validation
      if (user.companyId !== resolvedCompanyId) {
        throw new ForbiddenException('You can only update employers from your company');
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
      await this.logAudit(superEmployerId, 'update_employer', {
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
   * Deactivate employer (soft delete, company-scoped)
   * - Marks user as inactive
   * - Anonymizes email
   * - Invalidates all sessions
   */
  async deleteEmployer(
    superEmployerId: string,
    companyId: string | null,
    employerId: string,
    reason?: string,
  ) {
    const resolvedCompanyId = await this.resolveCompanyId(superEmployerId, companyId);
    this.logger.log(`Super employer ${superEmployerId} deleting employer: ${employerId}`);

    try {
      let employer = await this.db.query.employers.findFirst({
        where: eq(employers.id, employerId),
        with: {
          user: true,
        },
      });

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

      // Company scope validation
      if ((employer.user as any)?.companyId !== resolvedCompanyId) {
        throw new ForbiddenException('You can only delete employers from your company');
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
      await this.logAudit(superEmployerId, 'delete_employer', {
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
   * Map employer (with user relation) to response DTO
   */
  private mapEmployerToResponse(employer: any): CompanyEmployerResponseDto {
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
   * Log action for audit trail
   */
  private async logAudit(actorId: string, action: string, details: Record<string, any>) {
    this.logger.log(`Audit: ${action} by ${actorId}`, JSON.stringify(details));
  }
}
