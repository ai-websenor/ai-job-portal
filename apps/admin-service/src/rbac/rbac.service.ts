import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { Database, roles, permissions, rolePermissions } from '@ai-job-portal/database';
import { CreateRoleDto, UpdateRoleDto, CreatePermissionDto } from './dto';
import { DATABASE_CLIENT } from '../database/database.module';

@Injectable()
export class RbacService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  // ==================== ROLES ====================

  async getAllRoles() {
    const allRoles = await (this.db as any).query.roles.findMany({
      with: {
        rolePermissions: {
          with: {
            permission: true,
          },
        },
      },
      orderBy: (roles: any, { asc }: any) => [asc(roles.name)],
    });

    return (allRoles as any[]).map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isActive: role.isActive,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.rolePermissions.map((rp: any) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description,
        resource: rp.permission.resource,
        action: rp.permission.action,
        isActive: rp.permission.isActive,
      })),
    }));
  }

  async getRoleById(id: string) {
    const results = await (this.db as any).query.roles.findMany({
      where: (roles: any, { eq }: any) => eq(roles.id, id),
      limit: 1,
      with: {
        rolePermissions: {
          with: {
            permission: true,
          },
        },
      },
    });

    const role = results[0] as any;

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isActive: role.isActive,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.rolePermissions.map((rp: any) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description,
        resource: rp.permission.resource,
        action: rp.permission.action,
        isActive: rp.permission.isActive,
      })),
    };
  }

  async createRole(dto: CreateRoleDto) {
    // Check if role name already exists
    const existing = await this.db.query.roles.findFirst({
      where: eq(roles.name, dto.name),
    });

    if (existing) {
      throw new ConflictException(`Role with name "${dto.name}" already exists`);
    }

    // Create role
    const [newRole] = await this.db
      .insert(roles)
      .values({
        name: dto.name,
        description: dto.description || null,
        isActive: dto.isActive ?? true,
      })
      .returning();

    // Assign permissions if provided
    if (dto.permissionIds && dto.permissionIds.length > 0) {
      await this.assignPermissionsToRole(newRole.id, dto.permissionIds);
    }

    return this.getRoleById(newRole.id);
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const role = await this.db.query.roles.findFirst({
      where: eq(roles.id, id),
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    // Check if new name conflicts with another role
    if (dto.name && dto.name !== role.name) {
      const existing = await this.db.query.roles.findFirst({
        where: eq(roles.name, dto.name),
      });

      if (existing) {
        throw new ConflictException(`Role with name "${dto.name}" already exists`);
      }
    }

    // Update role
    await this.db
      .update(roles)
      .set({
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive,
        updatedAt: new Date(),
      })
      .where(eq(roles.id, id));

    // Update permissions if provided
    if (dto.permissionIds !== undefined) {
      // Remove all existing permissions
      await this.db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));

      // Add new permissions
      if (dto.permissionIds.length > 0) {
        await this.assignPermissionsToRole(id, dto.permissionIds);
      }
    }

    return this.getRoleById(id);
  }

  async deleteRole(id: string) {
    const role = await this.db.query.roles.findFirst({
      where: eq(roles.id, id),
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    // Delete role (cascade deletes rolePermissions and userRoles)
    await this.db.delete(roles).where(eq(roles.id, id));

    return { message: 'Role deleted successfully' };
  }

  // ==================== PERMISSIONS ====================

  async getAllPermissions() {
    return this.db.query.permissions.findMany({
      orderBy: (permissions, { asc }) => [asc(permissions.resource), asc(permissions.action)],
    });
  }

  async getPermissionById(id: string) {
    const permission = await this.db.query.permissions.findFirst({
      where: eq(permissions.id, id),
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }

    return permission;
  }

  async createPermission(dto: CreatePermissionDto) {
    // Check if permission name already exists
    const existing = await this.db.query.permissions.findFirst({
      where: eq(permissions.name, dto.name),
    });

    if (existing) {
      throw new ConflictException(`Permission with name "${dto.name}" already exists`);
    }

    const [newPermission] = await this.db
      .insert(permissions)
      .values({
        name: dto.name,
        description: dto.description || null,
        resource: dto.resource,
        action: dto.action,
        isActive: dto.isActive ?? true,
      })
      .returning();

    return newPermission;
  }

  // ==================== ROLE PERMISSIONS ====================

  private async assignPermissionsToRole(roleId: string, permissionIds: string[]) {
    // Verify all permissions exist
    const existingPermissions = await this.db.query.permissions.findMany({
      where: inArray(permissions.id, permissionIds),
    });

    if (existingPermissions.length !== permissionIds.length) {
      throw new NotFoundException('One or more permission IDs are invalid');
    }

    // Insert role-permission mappings
    const values = permissionIds.map((permissionId) => ({
      roleId,
      permissionId,
    }));

    await this.db.insert(rolePermissions).values(values);
  }

  async assignPermissionsToRolePublic(roleId: string, permissionIds: string[]) {
    // Verify role exists
    const role = await this.db.query.roles.findFirst({
      where: eq(roles.id, roleId),
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Remove existing permissions
    await this.db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

    // Add new permissions
    if (permissionIds.length > 0) {
      await this.assignPermissionsToRole(roleId, permissionIds);
    }

    return this.getRoleById(roleId);
  }

  async removePermissionsFromRole(roleId: string, permissionIds: string[]) {
    await this.db
      .delete(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, roleId),
          inArray(rolePermissions.permissionId, permissionIds),
        ),
      );

    return this.getRoleById(roleId);
  }
}
