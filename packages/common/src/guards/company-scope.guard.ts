import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { COMPANY_SCOPED_KEY } from '../decorators/company-scope.decorator';

/**
 * Guard to enforce company scoping on endpoints marked with @CompanyScoped()
 *
 * - Checks if user has a company assigned
 * - Adds companyId to request context for use in services
 * - Only applies to endpoints marked with @CompanyScoped()
 */
@Injectable()
export class CompanyScopeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if endpoint is marked as company-scoped
    const isCompanyScoped = this.reflector.getAllAndOverride<boolean>(COMPANY_SCOPED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isCompanyScoped) {
      // Not a company-scoped endpoint, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userRole = request.headers['x-user-role'];
    const userCompanyId = request.headers['x-company-id']; // Added by gateway

    console.log(`🔒 CompanyScopeGuard - Role: ${userRole}, CompanyId: ${userCompanyId}, Headers:`, {
      'x-user-id': request.headers['x-user-id'],
      'x-user-role': request.headers['x-user-role'],
      'x-company-id': request.headers['x-company-id'],
    });

    // Super admins bypass company scoping
    if (userRole === 'super_admin') {
      return true;
    }

    // Admin users must have a company assigned
    if (userRole === 'admin') {
      if (!userCompanyId) {
        throw new ForbiddenException(
          'Admin user does not have a company assigned. Contact super admin.',
        );
      }

      // Add company ID to request for use in services
      (request as any).companyId = userCompanyId;
      console.log(`✅ CompanyScopeGuard - Set request.companyId = ${userCompanyId}`);
      return true;
    }

    // Super employer users - allow through even without x-company-id header
    // The service layer resolves companyId from employers table as fallback
    if (userRole === 'super_employer') {
      if (userCompanyId) {
        (request as any).companyId = userCompanyId;
        console.log(`✅ CompanyScopeGuard - Set request.companyId = ${userCompanyId}`);
      } else {
        console.log(
          `⚠️ CompanyScopeGuard - No x-company-id header for super_employer, service will resolve from employers table`,
        );
      }
      return true;
    }

    // Other roles don't have company scoping
    return true;
  }
}
