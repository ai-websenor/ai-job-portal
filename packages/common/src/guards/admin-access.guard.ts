import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PermissionService } from '../services/permission.service';

/**
 * Guard that checks if user has ACCESS_ADMIN_PANEL permission
 * Used to protect admin-service endpoints
 */
@Injectable()
export class AdminAccessGuard implements CanActivate {
  constructor(private permissionService: PermissionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.sub) {
      throw new UnauthorizedException('Authentication required');
    }

    // DEV ONLY: Bypass admin panel access check for super_admin
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment && user.role === 'super_admin') {
      console.log('[DEV] Super admin bypassing admin panel access check');
      return true;
    }

    const hasAccess = await this.permissionService.hasPermission(
      user.sub,
      'ACCESS_ADMIN_PANEL',
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        'Admin panel access denied. Only users with admin privileges are allowed.',
      );
    }

    return true;
  }
}
