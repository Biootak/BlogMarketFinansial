import { unstable_cache } from 'next/cache';
import { CACHE_CONFIG } from '@/config/cacheConfig';

/**
 * CacheManager is a utility class for managing cache in the application.
 * It provides methods for setting, getting, deleting, and clearing cache.
 */
class CacheManager {
  /**
   * cacheWrapper is a private method that wraps the Next.js 14 caching feature.
   * It takes a key, a function that returns a promise, and options for caching.
   * @param key The cache key.
   * @param fn The function that returns a promise.
   * @param options Options for caching.
   * @returns A promise that resolves to the cached value.
   */
  private async cacheWrapper<T>(
    key: string,
    fn: () => Promise<T>,
    options?: {
      tags?: string[];
      revalidate?: number;
    }
  ): Promise<T> {
    return unstable_cache(
      fn,
      [key],
      {
        tags: options?.tags || [],
        revalidate: options?.revalidate || CACHE_CONFIG.DEFAULT_TTL / 1000,
      }
    )();
  }

  /**
   * set sets a value in the cache.
   * @param key The cache key.
   * @param value The value to cache.
   * @param category The category of the cache.
   * @returns A promise that resolves to the cached value.
   */
  async set<T>(key: string, value: T, category?: keyof typeof CACHE_CONFIG.TTL): Promise<T> {
    const ttl = category ? CACHE_CONFIG.TTL[category] : CACHE_CONFIG.DEFAULT_TTL;
    return this.cacheWrapper(
      key,
      async () => value,
      {
        revalidate: ttl / 1000,
        tags: [category || 'default'],
      }
    );
  }

  /**
   * get gets a value from the cache.
   * @param key The cache key.
   * @returns A promise that resolves to the cached value or null if not found.
   */
  async get<T>(key: string): Promise<T | null> {
    return this.cacheWrapper<T | null>(
      key,
      async () => null
    );
  }

  /**
   * delete deletes a value from the cache.
   * @param key The cache key.
   * @returns A promise that resolves when the cache is deleted.
   */
  async delete(key: string): Promise<void> {
    // Next.js 14 handles cache invalidation through revalidation
    await this.set(key, null, undefined);
  }

  /**
   * clearPattern clears a pattern of cache keys.
   * @param pattern The pattern to clear.
   * @returns A promise that resolves when the cache is cleared.
   */
  async clearPattern(pattern: string): Promise<void> {
    // در Next.js 14 می‌توانیم از تگ‌ها برای پاک کردن گروهی استفاده کنیم
    // این قسمت در آینده پیاده‌سازی خواهد شد
  }

  /**
   * getStats gets the cache statistics.
   * @returns An object with cache statistics.
   */
  getStats() {
    return {
      keys: 0, // Next.js 14 handles cache stats internally
      size: 0,
      maxSize: CACHE_CONFIG.MAX_ITEMS,
      hits: 0,
      misses: 0,
    };
  }
}

// ایجاد یک نمونه singleton از مدیریت کش
const cacheManager = new CacheManager();

export default cacheManager;
