import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Optional() @Inject('DATABASE_CLIENT') private readonly db?: any,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    let userRole = request.headers['x-user-role'];
    let userId = request.headers['x-user-id'];

    // If headers are missing, try to extract from JWT
    if (!userRole || !userId) {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const payloadBase64 = token.split('.')[1];
          const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
          const payload = JSON.parse(payloadJson);
          userRole = userRole || payload.role;
          userId = userId || payload.sub;
        } catch {
          // JWT decode failed
        }
      }
    }

    // Super admin always has full access
    if (userRole === 'super_admin') {
      return true;
    }

    // Super employer has full access (permissions are managed at a higher level)
    if (userRole === 'super_employer') {
      return true;
    }

    // For employer role: check actual permissions from DB
    if (userRole === 'employer' && userId && this.db) {
      try {
        const userPermissions = await this.getEmployerPermissions(userId);
        const hasAllPermissions = requiredPermissions.every((perm) =>
          userPermissions.includes(perm),
        );

        if (hasAllPermissions) {
          return true;
        }
      } catch {
        // DB query failed, deny access
      }
    }

    throw new ForbiddenException('Insufficient permissions');
  }

  /**
   * Fetch employer permissions from RBAC tables using raw SQL.
   * employers.rbac_role_id -> role_permissions -> permissions
   */
  private async getEmployerPermissions(userId: string): Promise<string[]> {
    if (!this.db?.execute) {
      return [];
    }

    const { sql } = await import('drizzle-orm');

    const result = await this.db.execute(sql`
      SELECT p.name
      FROM employers e
      JOIN role_permissions rp ON rp.role_id = e.rbac_role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE e.user_id = ${userId}
        AND p.is_active = true
    `);

    return (result.rows || result || []).map((row: any) => row.name);
  }
}
