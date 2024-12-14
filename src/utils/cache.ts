import { unstable_cache, revalidateTag } from 'next/cache';
import { CACHE_CONFIG } from '@/config/cacheConfig';

/**
 * CacheManager is a utility class for managing cache in the application.
 * It provides methods for setting, getting, deleting, and clearing cache.
 */
class CacheManager {
  private enabled: boolean = true;

  /**
   * Enable or disable the cache manager
   * @param status The status to set
   */
  public setEnabled(status: boolean): void {
    this.enabled = status;
  }

  /**
   * Check if cache is enabled
   * @returns boolean indicating if cache is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

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
      revalidate?: number;
      tags?: string[];
    }
  ): Promise<T> {
    return unstable_cache(
      fn,
      [key],
      {
        tags: options?.tags || [key],
        revalidate: options?.revalidate || CACHE_CONFIG.DEFAULT_TTL / 1000,
      }
    )();
  }

  /**
   * set sets a value in the cache.
   * @param key The cache key.
   * @param value The value to cache.
   * @param category The category of the cache.
   * @param tags Additional cache tags for revalidation.
   * @returns A promise that resolves to void.
   */
  public async set<T>(
    key: string, 
    value: T, 
    category?: keyof typeof CACHE_CONFIG.TTL,
    tags?: string[]
  ): Promise<void> {
    if (!this.enabled) return;
    
    const ttl = category ? CACHE_CONFIG.TTL[category] : CACHE_CONFIG.DEFAULT_TTL;
    await this.cacheWrapper(key, async () => value, { 
      revalidate: ttl / 1000,
      tags: tags
    });
  }

  /**
   * get retrieves a value from the cache.
   * @param key The cache key.
   * @returns A promise that resolves to the cached value or null if not found.
   */
  public async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) return null;
    
    try {
      return await this.cacheWrapper(key, async () => {
        throw new Error('Cache miss');
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * delete removes a value from the cache.
   * @param key The cache key.
   * @returns A promise that resolves when the cache is deleted.
   */
  async delete(key: string): Promise<void> {
    await revalidateTag(key);
  }

  /**
   * clearPattern clears a pattern of cache keys.
   * @param pattern The pattern to clear.
   * @returns A promise that resolves when the cache is cleared.
   */
  async clearPattern(pattern: string): Promise<void> {
    await revalidateTag(pattern);
  }

  /**
   * Clears all cached data
   */
  public clear(): void {
    if (!this.enabled) return;
    // Add tags for all cache types to ensure complete cache clearing
    const allCacheTypes = Object.keys(CACHE_CONFIG.TTL);
    allCacheTypes.forEach(tag => {
      revalidateTag(tag);
    });
  }

  /**
   * getWithSWR retrieves a value from the cache with SWR.
   * @param key The cache key.
   * @param fetcher The fetcher function to revalidate the cache.
   * @param options Optional options for caching.
   * @returns A promise that resolves to the cached value.
   */
  async getWithSWR<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: {
      revalidate?: number;
      tags?: string[];
    }
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) {
      // Revalidate in background
      this.set(key, await fetcher(), undefined).catch(console.error);
      return cached;
    }
    const fresh = await fetcher();
    await this.set(key, fresh, undefined);
    return fresh;
  }

  /**
   * getStats retrieves the cache statistics.
   * @returns An object with cache statistics.
   */
  async getStats() {
    return {
      hits: 0, // Next.js 14 handles stats internally
      misses: 0,
      size: 0,
      maxSize: CACHE_CONFIG.MAX_ITEMS,
    };
  }
}

// Create a singleton instance of the cache manager
const cacheManager = new CacheManager();

export default cacheManager;
