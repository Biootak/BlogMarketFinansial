import { LRUCache } from 'lru-cache';
import { CACHE_CONFIG } from '@/config/cacheConfig';



class CacheManager {
  private cache: LRUCache<string, any>;
  private enabled: boolean = true;
  private stats: {
    hits: number;
    misses: number;
    keys: number;
  };

  constructor() {
    this.cache = new LRUCache({
      max: CACHE_CONFIG.MAX_ITEMS,
      ttl: CACHE_CONFIG.DEFAULT_TTL,
      updateAgeOnGet: true,
      allowStale: false,
    });
    
    this.stats = {
      hits: 0,
      misses: 0,
      keys: 0,
    };
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

  // ذخیره داده در کش با پشتیبانی از زمان‌های نگهداری متفاوت
  set<T>(key: string, value: T, category?: keyof typeof CACHE_CONFIG.TTL): void {
    if (!this.enabled) return;
    
    const ttl = category ? CACHE_CONFIG.TTL[category] : CACHE_CONFIG.DEFAULT_TTL;
    this.cache.set(key, value, { ttl });
    this.stats.keys = this.cache.size;
  }

  // دریافت داده از کش با ثبت آمار
  get<T>(key: string): T | undefined {
    if (!this.enabled) return undefined;
    
    const value = this.cache.get(key) as T;
    if (value === undefined) {
      this.stats.misses++;
    } else {
      this.stats.hits++;
    }
    return value;
  }

  // حذف یک آیتم از کش
  delete(key: string): void {
    this.cache.delete(key);
  }

  // پاک کردن کل کش
  clear(): void {
    this.cache.clear();
  }

  // پاک کردن گروهی از کلیدها با الگو
  clearPattern(pattern: string): void {
    if (!this.enabled) return;
    
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
      }
    });
    this.stats.keys = this.cache.size;
  }

  // دریافت آمار دقیق کش
  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      size: this.cache.size,
      maxSize: CACHE_CONFIG.MAX_ITEMS,
    };
  }
}

// ایجاد یک نمونه singleton از مدیریت کش
const cacheManager = new CacheManager();

export default cacheManager;
