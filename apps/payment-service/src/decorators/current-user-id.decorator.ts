import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts user ID from:
 *  1. x-user-id header (set by API Gateway — production path)
 *  2. Authorization: Bearer <jwt> payload.sub (direct service calls — dev/testing path)
 *
 * Unlike @Headers('x-user-id'), this does NOT appear as a required field in Swagger.
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();

    // Primary: gateway-injected header
    const headerUserId = request.headers['x-user-id'] as string | undefined;
    if (headerUserId) return headerUserId;

    // Fallback: decode JWT Bearer token (no signature verification — gateway already did that)
    const auth = request.headers['authorization'] as string | undefined;
    if (auth?.startsWith('Bearer ')) {
      try {
        const payload = JSON.parse(
          Buffer.from(auth.slice(7).split('.')[1], 'base64').toString('utf8'),
        );
        return payload.sub as string | undefined;
      } catch {
        return undefined;
      }
    }

    return undefined;
  },
);
