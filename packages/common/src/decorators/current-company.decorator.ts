import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract companyId from request context
 * This is set by CompanyScopeGuard for admin users with company assignments
 *
 * @example
 * ```typescript
 * @Get('employers')
 * @CompanyScoped()
 * async listEmployers(@CurrentCompany() companyId: string) {
 *   // companyId will be the admin's assigned company ID
 * }
 * ```
 */
export const CurrentCompany = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    return (request as any).companyId || null;
  },
);
