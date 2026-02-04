import { Injectable, Inject } from '@nestjs/common';
import { Database, permissions, roles, rolePermissions, userRoles } from '@ai-job-portal/database';
import { eq, and } from 'drizzle-orm';
import { Redis } from 'ioredis';

/**
 * Service for managing user permissions with Redis caching
 */
@Injectable()
export class PermissionService {
  constructor(
    @Inject('DATABASE') private readonly db: Database,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  /**
   * Get all permissions for a user (with Redis caching)
   * Cache TTL: 15 minutes
   */
  async getUserPermissions(userId: string): Promise<Set<string>> {
    const cacheKey = `permissions:${userId}`;

    // Try to get from cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return new Set(JSON.parse(cached));
    }

    // Query from database
    const permissionsResult = await this.db
      .select({ code: permissions.code })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.isActive, true),
          eq(roles.isActive, true),
          eq(permissions.isActive, true),
        ),
      );

    const permissionSet = new Set(permissionsResult.map((p: { code: string }) => p.code));

    // Cache for 15 minutes (900 seconds)
    await this.redis.setex(cacheKey, 900, JSON.stringify([...permissionSet]));

    return permissionSet;
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(userId: string, permissionCode: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.has(permissionCode);
  }

  /**
   * Check if user has any of the specified permissions (OR logic)
   */
  async hasAnyPermission(userId: string, permissionCodes: string[]): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissionCodes.some(code => permissions.has(code));
  }

  /**
   * Check if user has all of the specified permissions (AND logic)
   */
  async hasAllPermissions(userId: string, permissionCodes: string[]): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissionCodes.every(code => permissions.has(code));
  }

  /**
   * Invalidate user permissions cache (call after role/permission changes)
   */
  async invalidateUserPermissions(userId: string): Promise<void> {
    const cacheKey = `permissions:${userId}`;
    await this.redis.del(cacheKey);
  }

  /**
   * Warm up permissions cache for a user (useful on login)
   */
  async warmUpCache(userId: string): Promise<void> {
    await this.getUserPermissions(userId);
  }
}
