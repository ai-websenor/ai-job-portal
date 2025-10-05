import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  ttl: number; // Time window in milliseconds
  limit: number; // Max requests in the time window
}

/**
 * Rate Limit decorator - Apply custom rate limiting to endpoint
 * @param options - Rate limit configuration
 * @example @RateLimit({ ttl: 60000, limit: 10 }) // 10 requests per minute
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);
