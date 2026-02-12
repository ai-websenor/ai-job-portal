import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { eq, and, or, ilike, desc, asc, sql, gte, lte } from 'drizzle-orm';
import { Database, users, activityLogs, companies } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import {
  ListUsersDto,
  UpdateUserStatusDto,
  UpdateUserRoleDto,
  BulkActionDto,
  CreateAdminDto,
} from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserManagementService {
  private readonly logger = new Logger(UserManagementService.name);

  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  /**
   * Create a new admin user with company assignment
   * Only SUPER_ADMIN can call this method
   */
  async createAdmin(creatorId: string, dto: CreateAdminDto) {
    // Handle system super admin (legacy string or UUID format)
    const SUPER_ADMIN_UUID = '00000000-0000-0000-0000-000000000000';
    const isSystemSuperAdmin = creatorId === 'super-admin' || creatorId === SUPER_ADMIN_UUID;

    // For grantedBy (foreign key to users): use null for system super admin
    const _grantedByValue = isSystemSuperAdmin ? null : creatorId;

    // For audit logs (NOT NULL column): use special UUID for system super admin
    const auditUserId = isSystemSuperAdmin ? SUPER_ADMIN_UUID : creatorId;

    this.logger.log(`Creating admin: ${dto.email} for company: ${dto.companyId}`);

    // Validate passwords match
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Validate password strength (min 8 chars)
    if (dto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    // Check if email already exists
    const existingUser = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email.toLowerCase()),
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Validate company exists
    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, dto.companyId),
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${dto.companyId} not found`);
    }

    // Hash password
    this.logger.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Use transaction to ensure admin is only created if ALL steps succeed
    const result = await this.db.transaction(async (tx) => {
      // Create admin user
      this.logger.log('Creating admin user in database...');
      const [adminUser] = await tx
        .insert(users)
        .values({
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email.toLowerCase(),
          password: hashedPassword,
          mobile: '+910000000000', // Placeholder
          role: 'admin',
          companyId: dto.companyId,
          isVerified: true,
          isMobileVerified: false,
          isActive: true,
          onboardingStep: 0,
          isOnboardingCompleted: true,
        } as any)
        .returning();

      this.logger.log(`Admin user created with ID: ${adminUser.id}`);

      // Log audit (inside transaction - rolls back if this fails)
      await tx.insert(activityLogs).values({
        companyId: dto.companyId,
        userId: auditUserId,
        action: 'create',
        entityType: 'user',
        entityId: adminUser.id,
        metadata: JSON.stringify({
          userId: adminUser.id,
          companyId: dto.companyId,
          email: dto.email,
          role: 'admin',
        }),
      } as any);

      return {
        userId: adminUser.id,
        email: adminUser.email,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        companyId: (adminUser as any).companyId,
        role: adminUser.role,
      };
    });

    return result;
  }

  async listUsers(dto: ListUsersDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (dto.role) {
      conditions.push(eq(users.role, dto.role as any));
    }
    if (dto.status) {
      // Map status to isActive field
      // 'active' = isActive: true
      // 'suspended' or 'deleted' = isActive: false
      if (dto.status === 'active') {
        conditions.push(eq(users.isActive, true));
      } else if (dto.status === 'suspended' || dto.status === 'deleted') {
        conditions.push(eq(users.isActive, false));
      }
    }
    if (dto.search) {
      conditions.push(
        or(
          ilike(users.email, `%${dto.search}%`),
          ilike(users.firstName, `%${dto.search}%`),
          ilike(users.lastName, `%${dto.search}%`),
          ilike(users.mobile, `%${dto.search}%`),
        ),
      );
    }

    // Date filtering
    if (dto.fromDate) {
      const fromDate = new Date(dto.fromDate);
      fromDate.setHours(0, 0, 0, 0);
      conditions.push(gte(users.createdAt, fromDate));
    }

    if (dto.toDate) {
      const toDate = new Date(dto.toDate);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(users.createdAt, toDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Determine sort order
    const sortBy = dto.sortBy || 'createdAt';
    const sortOrder = dto.sortOrder || 'desc';
    const orderByColumn = sortBy === 'createdAt' ? users.createdAt : users.createdAt;
    const orderByFn = sortOrder === 'asc' ? asc : desc;

    const [items, countResult] = await Promise.all([
      this.db.query.users.findMany({
        where: whereClause,
        orderBy: [orderByFn(orderByColumn)],
        limit,
        offset,
        columns: {
          password: false,
        },
      }),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.count || 0);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUser(userId: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { password: false },
      with: {
        profile: true,
        employer: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUserStatus(adminId: string, userId: string, dto: UpdateUserStatusDto) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === 'admin') {
      throw new ForbiddenException('Cannot modify admin user status');
    }

    const isActive = dto.status === 'active';
    const [updated] = await this.db
      .update(users)
      .set({
        isActive,
        updatedAt: new Date(),
      } as any)
      .where(eq(users.id, userId))
      .returning();

    // Log audit
    await this.logAudit(adminId, 'update', {
      userId,
      oldStatus: user.isActive ? 'active' : 'inactive',
      newStatus: dto.status,
      reason: dto.reason,
    });

    return updated;
  }

  async updateUserRole(adminId: string, userId: string, dto: UpdateUserRoleDto) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [updated] = await this.db
      .update(users)
      .set({
        role: dto.role,
        updatedAt: new Date(),
      } as any)
      .where(eq(users.id, userId))
      .returning();

    await this.logAudit(adminId, 'update', {
      userId,
      oldRole: user.role,
      newRole: dto.role,
    });

    return updated;
  }

  async deleteUser(adminId: string, userId: string, reason?: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === 'admin') {
      throw new ForbiddenException('Cannot delete admin user');
    }

    // Soft delete - mark as inactive
    await this.db
      .update(users)
      .set({
        isActive: false,
        email: `deleted_${Date.now()}_${user.email}`,
        updatedAt: new Date(),
      } as any)
      .where(eq(users.id, userId));

    await this.logAudit(adminId, 'delete', { userId, reason });

    return { success: true };
  }

  async bulkAction(adminId: string, dto: BulkActionDto) {
    const results: { userId: string; success: boolean; error?: string }[] = [];

    for (const userId of dto.userIds) {
      try {
        switch (dto.action) {
          case 'suspend':
            await this.updateUserStatus(adminId, userId, {
              status: 'suspended',
              reason: dto.reason,
            });
            break;
          case 'activate':
            await this.updateUserStatus(adminId, userId, { status: 'active' });
            break;
          case 'delete':
            await this.deleteUser(adminId, userId, dto.reason);
            break;
        }
        results.push({ userId, success: true });
      } catch (error: any) {
        results.push({ userId, success: false, error: error.message });
      }
    }

    return { results, processed: results.filter((r) => r.success).length };
  }

  async getUserStats() {
    const stats = await this.db
      .select({
        role: users.role,
        isActive: users.isActive,
        count: sql<number>`count(*)`,
      })
      .from(users)
      .groupBy(users.role, users.isActive);

    const byRole: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    stats.forEach((s) => {
      byRole[s.role] = (byRole[s.role] || 0) + Number(s.count);
      const status = s.isActive ? 'active' : 'inactive';
      byStatus[status] = (byStatus[status] || 0) + Number(s.count);
    });

    return { byRole, byStatus, total: Object.values(byRole).reduce((a, b) => a + b, 0) };
  }

  private async logAudit(adminId: string, action: string, details: Record<string, any>) {
    // Skip audit logging for system super admin (no user record in DB)
    const SUPER_ADMIN_UUID = '00000000-0000-0000-0000-000000000000';
    if (adminId === SUPER_ADMIN_UUID) {
      this.logger.log('Skipping audit log for system super admin');
      return;
    }

    await this.db.insert(activityLogs).values({
      companyId: details.companyId || adminId, // Use adminId as fallback
      userId: adminId,
      action,
      entityType: 'user',
      entityId: details.userId,
      metadata: JSON.stringify(details),
    } as any);
  }
}
