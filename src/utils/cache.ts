import { LRUCache } from 'lru-cache';

// تنظیمات پیش‌فرض کش
const DEFAULT_CACHE_OPTIONS = {
  max: 1000, // حداکثر تعداد آیتم‌ها
  ttl: 1000 * 60 * 60, // مدت زمان نگهداری: 1 ساعت
  updateAgeOnGet: true, // به‌روزرسانی زمان در هنگام دریافت
  allowStale: false, // عدم استفاده از داده‌های منقضی شده
};

class CacheManager {
  private cache: LRUCache<string, any>;
  private enabled: boolean = true;

  constructor() {
    this.cache = new LRUCache(DEFAULT_CACHE_OPTIONS);
  }

  // فعال/غیرفعال کردن کش
  setEnabled(status: boolean): void {
    this.enabled = status;
    if (!status) {
      this.clear();
    }
  }

  // بررسی وضعیت کش
  isEnabled(): boolean {
    return this.enabled;
  }

  // ذخیره داده در کش
  set<T>(key: string, value: T, ttl?: number): void {
    if (!this.enabled) return;
    
    const options = ttl ? { ttl } : undefined;
    this.cache.set(key, value, options);
  }

  // دریافت داده از کش
  get<T>(key: string): T | undefined {
    if (!this.enabled) return undefined;
    return this.cache.get(key) as T | undefined;
  }

  // حذف یک آیتم از کش
  delete(key: string): void {
    this.cache.delete(key);
  }

  // پاک کردن کل کش
  clear(): void {
    this.cache.clear();
  }

  // دریافت آمار کش
  getStats() {
    return {
      size: this.cache.size,
      max: this.cache.max,
    };
  }
}

// ایجاد یک نمونه singleton از مدیریت کش
const cacheManager = new CacheManager();

export default cacheManager;
