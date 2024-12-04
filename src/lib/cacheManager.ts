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
export function cacheData<T>(key: string, data: T, ttl?: number) {
  if (!isCacheKey(key)) { throw new Error('Invalid key provided'); }
  cacheManager.set(key, data, ttl);
}

// دریافت داده‌های کش شده
export function getCachedData<T>(key: string): T | undefined {
  if (!isCacheKey(key)) { throw new Error('Invalid key provided'); }
  return cacheManager.get<T>(key);
}

// پاک کردن یک کلید خاص از کش
export function clearCacheKey(key: string) {
  if (!isCacheKey(key)) { throw new Error('Invalid key provided'); }
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

function isCacheKey(key: string): key is 'POSTS' | 'CATEGORIES' | 'COMMENTS' | 'USER_PROFILE' {
  return ['POSTS', 'CATEGORIES', 'COMMENTS', 'USER_PROFILE'].includes(key);
}

function isValidCacheKey(key: string): boolean {
  return isCacheKey(key);
}
