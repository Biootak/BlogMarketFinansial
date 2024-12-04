import cacheManager from '@/utils/cache';
import { CACHE_CONFIG } from '@/config/cacheConfig';

export class CacheService {
  // مدیریت کش پست‌ها
  static async cachePost(postId: string, data: any) {
    cacheManager.set(CACHE_CONFIG.KEYS.POSTS.DETAIL(postId), data, 'POSTS');
  }

  static async getPost(postId: string) {
    return cacheManager.get(CACHE_CONFIG.KEYS.POSTS.DETAIL(postId));
  }

  static async invalidatePost(postId: string) {
    cacheManager.delete(CACHE_CONFIG.KEYS.POSTS.DETAIL(postId));
    cacheManager.clearPattern('posts:list'); // پاک کردن همه لیست‌های پست
  }

  // مدیریت کش دسته‌بندی‌ها
  static async cacheCategory(categoryId: string, data: any) {
    cacheManager.set(CACHE_CONFIG.KEYS.CATEGORIES.DETAIL(categoryId), data, 'CATEGORIES');
  }

  static async getCategory(categoryId: string) {
    return cacheManager.get(CACHE_CONFIG.KEYS.CATEGORIES.DETAIL(categoryId));
  }

  static async invalidateCategory(categoryId: string) {
    cacheManager.delete(CACHE_CONFIG.KEYS.CATEGORIES.DETAIL(categoryId));
    cacheManager.delete(CACHE_CONFIG.KEYS.CATEGORIES.LIST);
    // پاک کردن پست‌های مرتبط با این دسته‌بندی
    cacheManager.clearPattern(`posts:category:${categoryId}`);
  }

  // مدیریت کش نظرات
  static async cacheComments(postId: string, data: any) {
    cacheManager.set(CACHE_CONFIG.KEYS.COMMENTS.BY_POST(postId), data, 'COMMENTS');
  }

  static async getComments(postId: string) {
    return cacheManager.get(CACHE_CONFIG.KEYS.COMMENTS.BY_POST(postId));
  }

  static async invalidateComments(postId: string) {
    cacheManager.delete(CACHE_CONFIG.KEYS.COMMENTS.BY_POST(postId));
    cacheManager.delete(CACHE_CONFIG.KEYS.COMMENTS.RECENT);
  }

  // مدیریت کش کاربر
  static async cacheUserProfile(userId: string, data: any) {
    cacheManager.set(CACHE_CONFIG.KEYS.USER.PROFILE(userId), data, 'USER_PROFILE');
  }

  static async getUserProfile(userId: string) {
    return cacheManager.get(CACHE_CONFIG.KEYS.USER.PROFILE(userId));
  }

  static async invalidateUserProfile(userId: string) {
    cacheManager.delete(CACHE_CONFIG.KEYS.USER.PROFILE(userId));
    cacheManager.delete(CACHE_CONFIG.KEYS.USER.PREFERENCES(userId));
  }

  // گرفتن آمار کش
  static getStats() {
    return cacheManager.getStats();
  }
}
