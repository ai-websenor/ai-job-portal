import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY = 'cache';
export const CACHE_TTL_KEY = 'cacheTTL';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key
}

/**
 * Cache decorator - Enable caching for endpoint
 * @param options - Cache configuration
 * @example @Cache({ ttl: 3600, key: 'jobs-list' })
 */
export const Cache = (options?: CacheOptions) =>
  SetMetadata(CACHE_KEY, options || {});

/**
 * No Cache decorator - Explicitly disable caching for endpoint
 * @example @NoCache()
 */
export const NoCache = () => SetMetadata(CACHE_KEY, { disabled: true });

/**
 * Invalidate Cache decorator - Invalidate cache after this operation
 * @param keys - Cache keys to invalidate
 * @example @InvalidateCache('jobs-list', 'jobs-featured')
 */
export const InvalidateCache = (...keys: string[]) =>
  SetMetadata('invalidateCache', keys);
