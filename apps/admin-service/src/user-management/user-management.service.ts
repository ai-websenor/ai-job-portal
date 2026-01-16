import { Injectable, Inject, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and, or, ilike, desc, sql, inArray } from 'drizzle-orm';
import { Database, users, profiles, employers, activityLogs } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { ListUsersDto, UpdateUserStatusDto, UpdateUserRoleDto, BulkActionDto } from './dto';

@Injectable()
export class UserManagementService {
  private readonly logger = new Logger(UserManagementService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
  ) {}

  async listUsers(dto: ListUsersDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (dto.role) {
      conditions.push(eq(users.role, dto.role as any));
    }
    if (dto.status) {
      // Map status to isActive
      conditions.push(eq(users.isActive, dto.status === 'active'));
    }
    if (dto.search) {
      conditions.push(ilike(users.email, `%${dto.search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countResult] = await Promise.all([
      this.db.query.users.findMany({
        where: whereClause,
        orderBy: [desc(users.createdAt)],
        limit,
        offset,
        columns: {
          password: false,
        },
      }),
      this.db.select({ count: sql<number>`count(*)` }).from(users).where(whereClause),
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
    const [updated] = await this.db.update(users)
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

    const [updated] = await this.db.update(users)
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
    await this.db.update(users)
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
            await this.updateUserStatus(adminId, userId, { status: 'suspended', reason: dto.reason });
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

    return { results, processed: results.filter(r => r.success).length };
  }

  async getUserStats() {
    const stats = await this.db.select({
      role: users.role,
      isActive: users.isActive,
      count: sql<number>`count(*)`,
    })
      .from(users)
      .groupBy(users.role, users.isActive);

    const byRole: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    stats.forEach(s => {
      byRole[s.role] = (byRole[s.role] || 0) + Number(s.count);
      const status = s.isActive ? 'active' : 'inactive';
      byStatus[status] = (byStatus[status] || 0) + Number(s.count);
    });

    return { byRole, byStatus, total: Object.values(byRole).reduce((a, b) => a + b, 0) };
  }

  private async logAudit(adminId: string, action: string, details: Record<string, any>) {
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
