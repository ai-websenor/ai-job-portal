import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionService } from '../services/permission.service';

/**
 * Guard that checks if user has required permissions
 * Uses OR logic - user needs at least one of the specified permissions
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.sub) {
      throw new UnauthorizedException('User not authenticated');
    }

    // DEV ONLY: Bypass permission checks for super_admin
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment && user.role === 'super_admin') {
      console.log(`[DEV] Super admin bypassing permission check: ${requiredPermissions.join(', ')}`);
      return true;
    }

    // Check if user has any of the required permissions
    const hasPermission = await this.permissionService.hasAnyPermission(
      user.sub,
      requiredPermissions,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied. Required permissions: ${requiredPermissions.join(' OR ')}`,
      );
    }

    return true;
  }
}
