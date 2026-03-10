import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts x-user-id from request headers (set by API Gateway from JWT).
 * Unlike @Headers('x-user-id'), this does NOT appear as a required field in Swagger.
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['x-user-id'];
  },
);
