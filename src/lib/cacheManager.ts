import type { CACHE_CONFIG } from '@/config/cacheConfig';
import cacheManager from '@/utils/cache';

let CACHE_ENABLED = true;

export function setCacheStatus(status: boolean) {
  CACHE_ENABLED = status;
  cacheManager.setEnabled(status);
}

export function getCacheStatus(): boolean {
  return CACHE_ENABLED;
}

// کش کردن داده‌ها با کلید
export function cacheData<T>(key: 'POSTS' | 'CATEGORIES' | 'COMMENTS' | 'USER_PROFILE' | 'MARKET_DATA', data: T, category?: keyof typeof CACHE_CONFIG.TTL) {
  if (!isValidCacheKey(key)) { throw new Error('Invalid key provided'); }
  cacheManager.set(key, data, category);
}

// دریافت داده‌های کش شده
export async function getCachedData<T>(key: 'POSTS' | 'CATEGORIES' | 'COMMENTS' | 'USER_PROFILE' | 'MARKET_DATA'): Promise<T | undefined> {
  if (!isValidCacheKey(key)) { throw new Error('Invalid key provided'); }
  const result = await cacheManager.get<T>(key);
  return result ?? undefined;
}

// پاک کردن یک کلید خاص از کش
export function clearCacheKey(key: 'POSTS' | 'CATEGORIES' | 'COMMENTS' | 'USER_PROFILE' | 'MARKET_DATA') {
  if (!isValidCacheKey(key)) { throw new Error('Invalid key provided'); }
  cacheManager.delete(key);
}

// پاک کردن کل کش
export function clearAllCache() {
  cacheManager.clear();
}

// دریافت آمار کش
export function getCacheStats() {
  return cacheManager.getStats();
}

function isCacheKey(key: string): key is 'POSTS' | 'CATEGORIES' | 'COMMENTS' | 'USER_PROFILE' | 'MARKET_DATA' {
  return ['POSTS', 'CATEGORIES', 'COMMENTS', 'USER_PROFILE', 'MARKET_DATA'].includes(key);
}

function isValidCacheKey(key: 'POSTS' | 'CATEGORIES' | 'COMMENTS' | 'USER_PROFILE' | 'MARKET_DATA'): boolean {
  return isCacheKey(key);
}
