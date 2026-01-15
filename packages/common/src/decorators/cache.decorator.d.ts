export declare const CACHE_KEY = 'cache';
export declare const CACHE_TTL_KEY = 'cacheTTL';
export interface CacheOptions {
  ttl?: number;
  key?: string;
}
export declare const Cache: (
  options?: CacheOptions,
) => import('node_modules/@nestjs/common').CustomDecorator<string>;
export declare const NoCache: () => import('node_modules/@nestjs/common').CustomDecorator<string>;
export declare const InvalidateCache: (
  ...keys: string[]
) => import('node_modules/@nestjs/common').CustomDecorator<string>;
