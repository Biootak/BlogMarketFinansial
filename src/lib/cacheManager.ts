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
  cacheManager.set(key, data, ttl);
}

// دریافت داده‌های کش شده
export function getCachedData<T>(key: string): T | undefined {
  return cacheManager.get<T>(key);
}

// پاک کردن یک کلید خاص از کش
export function clearCacheKey(key: string) {
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
