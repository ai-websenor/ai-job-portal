import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    let userRole = request.headers['x-user-role'];

    // If x-user-role header is missing, try to extract from JWT
    if (!userRole) {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          // Decode JWT payload (without verification - we trust it came from our gateway)
          const payloadBase64 = token.split('.')[1];
          const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
          const payload = JSON.parse(payloadJson);
          userRole = payload.role;
          console.log('✅ PermissionsGuard - Extracted role from JWT:', userRole);
        } catch (error: any) {
          console.log(
            '❌ PermissionsGuard - JWT decode failed:',
            error?.message || 'Unknown error',
          );
        }
      }
    }

    // Debug logging
    console.log('🔒 PermissionsGuard - Required permissions:', requiredPermissions);
    console.log('🔒 PermissionsGuard - User role:', userRole);

    // For now, if it's super_admin or super_employer, we allow it
    if (userRole === 'super_admin' || userRole === 'super_employer') {
      console.log('✅ PermissionsGuard - Access granted for role:', userRole);
      return true;
    }

    console.log('❌ PermissionsGuard - Access denied for role:', userRole);
    throw new ForbiddenException('Insufficient permissions');
  }
}
