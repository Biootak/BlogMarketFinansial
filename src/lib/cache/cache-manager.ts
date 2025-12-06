/**
 * Cache Manager
 * Implements caching strategies for better performance
 */

export interface CacheStrategy {
  type: 'static' | 'dynamic' | 'api';
  maxAge: number; // seconds
  staleWhileRevalidate?: number; // seconds
  cacheControl: string;
}

export interface CacheConfig {
  images: CacheStrategy;
  staticAssets: CacheStrategy;
  apiResponses: CacheStrategy;
  pages: CacheStrategy;
}

/**
 * Default cache configuration
 */
export const defaultCacheConfig: CacheConfig = {
  images: {
    type: 'static',
    maxAge: 31536000, // 1 year
    cacheControl: 'public, max-age=31536000, immutable',
  },
  staticAssets: {
    type: 'static',
    maxAge: 31536000, // 1 year
    cacheControl: 'public, max-age=31536000, immutable',
  },
  apiResponses: {
    type: 'api',
    maxAge: 60, // 1 minute
    staleWhileRevalidate: 300, // 5 minutes
    cacheControl: 'public, max-age=60, stale-while-revalidate=300',
  },
  pages: {
    type: 'dynamic',
    maxAge: 3600, // 1 hour
    staleWhileRevalidate: 86400, // 1 day
    cacheControl: 'public, max-age=3600, stale-while-revalidate=86400',
  },
};

/**
 * Cache Manager class
 */
export class CacheManager {
  private config: CacheConfig;
  private requestCache: Map<string, Promise<any>>;

  constructor(config: CacheConfig = defaultCacheConfig) {
    this.config = config;
    this.requestCache = new Map();
  }

  /**
   * Get cache headers for a resource type
   */
  getHeaders(type: keyof CacheConfig): Headers {
    const strategy = this.config[type];
    const headers = new Headers();
    headers.set('Cache-Control', strategy.cacheControl);
    return headers;
  }

  /**
   * Set cache headers on response
   */
  setCacheHeaders(response: Response, type: keyof CacheConfig): Response {
    const headers = this.getHeaders(type);
    headers.forEach((value, key) => {
      response.headers.set(key, value);
    });
    return response;
  }

  /**
   * Deduplicate concurrent requests
   */
  async deduplicateRequest<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Check if request is already in progress
    if (this.requestCache.has(key)) {
      return this.requestCache.get(key)!;
    }

    // Start new request
    const promise = fetcher().finally(() => {
      // Remove from cache when done
      this.requestCache.delete(key);
    });

    this.requestCache.set(key, promise);
    return promise;
  }

  /**
   * Prefetch URLs
   */
  async prefetch(urls: string[]): Promise<void> {
    if (typeof window === 'undefined') return;

    for (const url of urls) {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    }
  }

  /**
   * Preload critical resources
   */
  preload(url: string, as: 'script' | 'style' | 'image' | 'font'): void {
    if (typeof window === 'undefined') return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = as;

    if (as === 'font') {
      link.crossOrigin = 'anonymous';
    }

    document.head.appendChild(link);
  }

  /**
   * Clear request cache
   */
  clearCache(): void {
    this.requestCache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.requestCache.size;
  }
}

/**
 * Global cache manager instance
 */
let globalCacheManager: CacheManager | null = null;

/**
 * Get or create global cache manager
 */
export function getCacheManager(): CacheManager {
  if (!globalCacheManager) {
    globalCacheManager = new CacheManager();
  }
  return globalCacheManager;
}

/**
 * Create cache key from URL and params
 */
export function createCacheKey(url: string, params?: Record<string, any>): string {
  if (!params) return url;

  const searchParams = new URLSearchParams(params);
  return `${url}?${searchParams.toString()}`;
}
