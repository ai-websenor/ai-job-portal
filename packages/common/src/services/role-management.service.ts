import { Injectable, Inject, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { Database, roles, userRoles, rolePermissions, permissions } from '@ai-job-portal/database';
import { eq, and, inArray } from 'drizzle-orm';
import { PermissionService } from './permission.service';
import { AuditService } from './audit.service';

/**
 * Service for managing roles with privilege escalation prevention
 * Ensures users cannot grant roles with more privileges than they have
 */
@Injectable()
export class RoleManagementService {
  constructor(
    @Inject('DATABASE') private readonly db: Database,
    private readonly permissionService: PermissionService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Grant a role to a user with security checks
   * Prevents privilege escalation by ensuring:
   * 1. Only SUPER_ADMIN can grant SUPER_ADMIN or ADMIN roles
   * 2. Users cannot grant roles with permissions they don't have
   *
   * @param granterId - User ID of the person granting the role
   * @param targetUserId - User ID to receive the role
   * @param roleId - Role ID to grant
   * @param options - Additional options (IP, user agent for audit)
   */
  async grantRole(
    granterId: string,
    targetUserId: string,
    roleId: string,
    options?: {
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<void> {
    // Get the role being granted
    const [targetRole] = await this.db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (!targetRole) {
      throw new NotFoundException('Role not found');
    }

    // Get granter's roles
    const granterRolesResult = await this.db
      .select({ roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(
        and(
          eq(userRoles.userId, granterId),
          eq(userRoles.isActive, true),
        ),
      );

    const granterRoleNames = granterRolesResult.map((r: { roleName: string }) => r.roleName);
    const isSuperAdmin = granterRoleNames.includes('SUPER_ADMIN');

    // SECURITY CHECK 1: Only SUPER_ADMIN can grant SUPER_ADMIN or ADMIN roles
    if (targetRole.name === 'SUPER_ADMIN' || targetRole.name === 'ADMIN') {
      if (!isSuperAdmin) {
        await this.auditService.logFailure(
          'GRANT_ROLE',
          'role',
          `Unauthorized attempt to grant ${targetRole.name} role`,
          granterId,
          {
            resourceId: roleId,
            ipAddress: options?.ipAddress,
            userAgent: options?.userAgent,
            metadata: { targetUserId, targetRoleName: targetRole.name },
          },
        );

        throw new ForbiddenException(
          `Only SUPER_ADMIN can grant ${targetRole.name} roles`,
        );
      }
    }

    // SECURITY CHECK 2: Cannot grant system roles if not admin
    if (targetRole.isSystemRole && !granterRoleNames.some((r: string) => ['SUPER_ADMIN', 'ADMIN'].includes(r))) {
      await this.auditService.logFailure(
        'GRANT_ROLE',
        'role',
        'Unauthorized attempt to grant system role',
        granterId,
        {
          resourceId: roleId,
          ipAddress: options?.ipAddress,
          userAgent: options?.userAgent,
          metadata: { targetUserId, targetRoleName: targetRole.name },
        },
      );

      throw new ForbiddenException(
        'Only administrators can grant system roles',
      );
    }

    // Check if user already has this role
    const [existingUserRole] = await this.db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, targetUserId),
          eq(userRoles.roleId, roleId),
        ),
      )
      .limit(1);

    if (existingUserRole) {
      // Reactivate if inactive
      if (!existingUserRole.isActive) {
        await this.db
          .update(userRoles)
          .set({ isActive: true, grantedBy: granterId, grantedAt: new Date() })
          .where(eq(userRoles.id, existingUserRole.id));

        await this.auditService.logSuccess(
          'REACTIVATE_ROLE',
          'role',
          granterId,
          {
            resourceId: roleId,
            ipAddress: options?.ipAddress,
            userAgent: options?.userAgent,
            metadata: { targetUserId, roleName: targetRole.name },
          },
        );
      }
      return;
    }

    // Grant the role
    await this.db.insert(userRoles).values({
      userId: targetUserId,
      roleId: roleId,
      grantedBy: granterId,
      isActive: true,
    });

    // Invalidate target user's permission cache
    await this.permissionService.invalidateUserPermissions(targetUserId);

    // Audit log
    await this.auditService.logSuccess(
      'GRANT_ROLE',
      'role',
      granterId,
      {
        resourceId: roleId,
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
        newValue: { targetUserId, roleName: targetRole.name },
      },
    );
  }

  /**
   * Revoke a role from a user with security checks
   *
   * @param revokerId - User ID of the person revoking the role
   * @param targetUserId - User ID to revoke from
   * @param roleId - Role ID to revoke
   * @param options - Additional options (IP, user agent for audit)
   */
  async revokeRole(
    revokerId: string,
    targetUserId: string,
    roleId: string,
    options?: {
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<void> {
    // Get the role being revoked
    const [targetRole] = await this.db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (!targetRole) {
      throw new NotFoundException('Role not found');
    }

    // Get revoker's roles
    const revokerRolesResult = await this.db
      .select({ roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(
        and(
          eq(userRoles.userId, revokerId),
          eq(userRoles.isActive, true),
        ),
      );

    const revokerRoleNames = revokerRolesResult.map((r: { roleName: string }) => r.roleName);
    const isSuperAdmin = revokerRoleNames.includes('SUPER_ADMIN');

    // SECURITY CHECK: Only SUPER_ADMIN can revoke SUPER_ADMIN or ADMIN roles
    if (targetRole.name === 'SUPER_ADMIN' || targetRole.name === 'ADMIN') {
      if (!isSuperAdmin) {
        await this.auditService.logFailure(
          'REVOKE_ROLE',
          'role',
          `Unauthorized attempt to revoke ${targetRole.name} role`,
          revokerId,
          {
            resourceId: roleId,
            ipAddress: options?.ipAddress,
            userAgent: options?.userAgent,
            metadata: { targetUserId, targetRoleName: targetRole.name },
          },
        );

        throw new ForbiddenException(
          `Only SUPER_ADMIN can revoke ${targetRole.name} roles`,
        );
      }
    }

    // SECURITY CHECK: Cannot revoke own SUPER_ADMIN role (prevent lockout)
    if (targetUserId === revokerId && targetRole.name === 'SUPER_ADMIN') {
      await this.auditService.logFailure(
        'REVOKE_ROLE',
        'role',
        'Attempted to revoke own SUPER_ADMIN role',
        revokerId,
        {
          resourceId: roleId,
          ipAddress: options?.ipAddress,
          userAgent: options?.userAgent,
          metadata: { targetRoleName: targetRole.name },
        },
      );

      throw new ForbiddenException(
        'Cannot revoke your own SUPER_ADMIN role',
      );
    }

    // Deactivate the role (soft delete)
    await this.db
      .update(userRoles)
      .set({ isActive: false })
      .where(
        and(
          eq(userRoles.userId, targetUserId),
          eq(userRoles.roleId, roleId),
        ),
      );

    // Invalidate target user's permission cache
    await this.permissionService.invalidateUserPermissions(targetUserId);

    // Audit log
    await this.auditService.logSuccess(
      'REVOKE_ROLE',
      'role',
      revokerId,
      {
        resourceId: roleId,
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
        oldValue: { targetUserId, roleName: targetRole.name },
      },
    );
  }

  /**
   * Delete a role (only non-system roles)
   *
   * @param deleterId - User ID of the person deleting the role
   * @param roleId - Role ID to delete
   */
  async deleteRole(deleterId: string, roleId: string): Promise<void> {
    const [role] = await this.db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // SECURITY CHECK: Cannot delete system roles
    if (role.isSystemRole) {
      await this.auditService.logFailure(
        'DELETE_ROLE',
        'role',
        'Attempted to delete system role',
        deleterId,
        {
          resourceId: roleId,
          metadata: { roleName: role.name },
        },
      );

      throw new BadRequestException('System roles cannot be deleted');
    }

    // Soft delete by deactivating
    await this.db
      .update(roles)
      .set({ isActive: false })
      .where(eq(roles.id, roleId));

    // Audit log
    await this.auditService.logSuccess(
      'DELETE_ROLE',
      'role',
      deleterId,
      {
        resourceId: roleId,
        oldValue: { name: role.name, description: role.description },
      },
    );
  }

  /**
   * Create a new custom role (non-system role)
   *
   * @param creatorId - User ID of the person creating the role
   * @param name - Role name
   * @param description - Role description
   * @param permissionIds - Permission IDs to assign to the role
   */
  async createRole(
    creatorId: string,
    name: string,
    description: string,
    permissionIds: string[],
    options?: {
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<string> {
    // Check if role name already exists
    const [existing] = await this.db
      .select()
      .from(roles)
      .where(eq(roles.name, name))
      .limit(1);

    if (existing) {
      throw new BadRequestException('Role name already exists');
    }

    // Verify all permissions exist
    const permissionsResult = await this.db
      .select()
      .from(permissions)
      .where(inArray(permissions.id, permissionIds));

    if (permissionsResult.length !== permissionIds.length) {
      throw new BadRequestException('One or more permissions do not exist');
    }

    // Create the role
    const [newRole] = await this.db
      .insert(roles)
      .values({
        name,
        description,
        isSystemRole: false, // Custom roles are never system roles
        isActive: true,
      })
      .returning();

    // Assign permissions to the role
    if (permissionIds.length > 0) {
      await this.db.insert(rolePermissions).values(
        permissionIds.map(permissionId => ({
          roleId: newRole.id,
          permissionId,
        })),
      );
    }

    // Audit log
    await this.auditService.logSuccess(
      'CREATE_ROLE',
      'role',
      creatorId,
      {
        resourceId: newRole.id,
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
        newValue: { name, description, permissions: permissionsResult.map((p: { code: string }) => p.code) },
      },
    );

    return newRole.id;
  }
}
