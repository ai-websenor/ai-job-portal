import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// ============================================
// PARAMETER DECORATORS
// ============================================

// Get current user from request
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// Get user ID from request
export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.id;
  },
);

// Get user role from request
export const GetUserRole = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.role;
  },
);

// Get company ID from request
export const CompanyId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.companyId;
  },
);

// Get IP address from request
export const IpAddress = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.ip || request.connection.remoteAddress;
  },
);

// Get user agent from request
export const UserAgent = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['user-agent'];
  },
);

// ============================================
// RESPONSE DECORATORS
// ============================================

// Custom API response decorator
export const ApiSuccessResponse = (message: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);
      return {
        success: true,
        message,
        data: result,
      };
    };
    return descriptor;
  };
};

// ============================================
// EXPORT ALL DECORATORS
// ============================================

export * from './role.decorator';
export * from './permissions.decorator';
export * from './subscription.decorator';
export * from './public.decorator';
export * from './rate-limit.decorator';
export * from './validation.decorator';
export * from './cache.decorator';
export * from './audit.decorator';
