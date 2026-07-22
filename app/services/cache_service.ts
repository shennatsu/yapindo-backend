import redis from '@adonisjs/redis/services/main'

/**
 * Thin wrapper around the Redis client implementing the cache-aside
 * pattern. Deliberately generic - no knowledge of any domain concept
 * (projects, tasks). Endpoint-specific caching decisions (which keys,
 * what TTL, when to invalidate) live at the call site, in a later
 * commit - this service only handles the mechanics of "check cache,
 * compute on miss, store, return", plus JSON serialization.
 */
class CacheService {
  /**
   * Returns the cached value for `key` if present; otherwise calls
   * `resolver`, stores its result with the given TTL, and returns it.
   */
  async remember<T>(key: string, ttlSeconds: number, resolver: () => Promise<T>): Promise<T> {
    const cached = await redis.get(key)

    if (cached !== null) {
      return JSON.parse(cached) as T
    }

    const value = await resolver()
    await redis.setex(key, ttlSeconds, JSON.stringify(value))

    return value
  }

  /**
   * Explicitly removes a single key - used on writes that make a
   * cached value stale before its TTL naturally expires.
   */
  async forget(key: string): Promise<void> {
    await redis.del(key)
  }

  /**
   * Removes every key matching a prefix (e.g. all `project:5:*` keys
   * after project 5 changes). Uses SCAN rather than KEYS to avoid
   * blocking Redis on a large keyspace.
   */
  async forgetByPrefix(prefix: string): Promise<void> {
    let cursor = '0'

    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100)
      cursor = nextCursor

      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } while (cursor !== '0')
  }
}

export default new CacheService()
