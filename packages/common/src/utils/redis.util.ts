/**
 * Minimal interface for the ioredis scan method.
 * Avoids a hard dependency on ioredis in the common package.
 */
interface RedisScanClient {
  scan(cursor: string, ...args: any[]): Promise<[string, string[]]>;
}

/**
 * Non-blocking SCAN-based alternative to redis.keys().
 * KEYS is O(N) and blocks the entire Redis server — use this instead.
 *
 * @param redis  ioredis client instance
 * @param pattern  Glob-style pattern (e.g. "rec:*", "settings:*")
 * @param batchSize  Number of keys to return per SCAN iteration (default 100)
 */
export async function scanKeys(
  redis: RedisScanClient,
  pattern: string,
  batchSize = 100,
): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';
  do {
    const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', batchSize);
    cursor = nextCursor;
    keys.push(...batch);
  } while (cursor !== '0');
  return keys;
}
