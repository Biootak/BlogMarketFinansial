/**
 * Simple in-memory cache for report data with TTL support
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ReportCache {
  private cache: Map<string, CacheEntry<any>>;
  private static instance: ReportCache;

  private constructor() {
    this.cache = new Map();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ReportCache {
    if (!ReportCache.instance) {
      ReportCache.instance = new ReportCache();
    }
    return ReportCache.instance;
  }

  /**
   * Get cached data if available and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if cache entry has expired
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache data with TTL
   */
  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Clear specific cache entry or all entries matching pattern
   */
  clear(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    // Clear entries matching pattern
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }
}

/**
 * Generate cache key for report data
 */
export function generateReportCacheKey(userId: string | undefined, from: Date, to: Date): string {
  const fromStr = from.toISOString().split('T')[0];
  const toStr = to.toISOString().split('T')[0];
  return `report:${userId || 'all'}:${fromStr}:${toStr}`;
}

/**
 * Default cache TTL: 5 minutes
 */
export const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Export singleton instance
export const reportCache = ReportCache.getInstance();
