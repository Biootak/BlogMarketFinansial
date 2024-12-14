import { revalidateTag } from 'next/cache';
import cacheManager from '@/utils/cache';
import { CACHE_CONFIG } from '@/config/cacheConfig';
import {
  invalidateUserCache,
  invalidatePublicCache,
  invalidateHomePageCache,
  invalidatePostCache,
} from '@/actions/cacheActions';

// مدیریت کش پست‌ها
export async function cachePost(postId: string, data: any) {
  await cacheManager.set(CACHE_CONFIG.KEYS.POSTS.DETAIL(postId), data, 'POSTS');
}

export async function getCachedPost(postId: string) {
  return cacheManager.get(CACHE_CONFIG.KEYS.POSTS.DETAIL(postId));
}

export async function invalidatePost(postId: string) {
  revalidateTag('POSTS');
  revalidateTag(`post-${postId}`);
}

// مدیریت کش دسته‌بندی‌ها
export async function cacheCategory(categoryId: string, data: any) {
  await cacheManager.set(CACHE_CONFIG.KEYS.CATEGORIES.DETAIL(categoryId), data, 'CATEGORIES');
}

export async function getCachedCategory(categoryId: string) {
  return cacheManager.get(CACHE_CONFIG.KEYS.CATEGORIES.DETAIL(categoryId));
}

export async function invalidateCategory(categoryId: string) {
  revalidateTag('CATEGORIES');
  await revalidateTag(`category-${categoryId}`);
}

// مدیریت کش نظرات
export async function cacheComments(postId: string, data: any) {
  await cacheManager.set(CACHE_CONFIG.KEYS.COMMENTS.BY_POST(postId), data, 'COMMENTS');
}

export async function getCachedComments(postId: string) {
  return cacheManager.get(CACHE_CONFIG.KEYS.COMMENTS.BY_POST(postId));
}

export async function invalidateComments(postId: string) {
  revalidateTag('COMMENTS');
  await revalidateTag(`comments-${postId}`);
}

// مدیریت کش کاربر
export async function cacheUserProfile(userId: string, data: any) {
  await cacheManager.set(CACHE_CONFIG.KEYS.USER.PROFILE(userId), data, 'USER_PROFILE');
}

export async function getCachedUserProfile(userId: string) {
  return cacheManager.get(CACHE_CONFIG.KEYS.USER.PROFILE(userId));
}

export async function invalidateUserProfile(userId: string) {
  await revalidateTag('USER_PROFILE');
  await revalidateTag(`user-${userId}`);
}

// مدیریت کش داده‌های کاربر
export async function invalidateUserData(userId: string) {
  await invalidateUserCache(userId);
}

// مدیریت کش داده‌های عمومی
export async function invalidatePublicData() {
  await invalidatePublicCache();
}

// مدیریت کش داده‌های صفحه اصلی
export async function invalidateHomePageData() {
  await invalidateHomePageCache();
}

// مدیریت کش داده‌های پست
export async function invalidatePostData(postId: string) {
  await invalidatePostCache(postId);
}

// پاک کردن تمام کش‌های مربوط به نقش کاربر
export async function invalidateRoleBasedCache(role: string) {
  // کش‌های مربوط به نقش نویسنده
  if (role === 'AUTHOR') {
    await revalidateTag('author-posts');
    await revalidateTag('author-dashboard');
  }
  // کش‌های مربوط به نقش ادمین
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    await revalidateTag('admin-dashboard');
    await revalidateTag('user-management');
    await revalidateTag('site-settings');
  }
  // کش‌های عمومی که ممکن است تحت تأثیر نقش کاربر باشند
  await revalidateTag('dashboard-data');
  await revalidateTag('user-permissions');
}

// پاک کردن تمام کش‌های مرتبط با کاربر
export async function invalidateAllUserRelatedCache(userId: string, role: string) {
  // کش‌های شخصی کاربر
  await invalidateUserData(userId);
  await invalidateUserProfile(userId);
  
  // کش‌های مربوط به نقش
  await invalidateRoleBasedCache(role);
  
  // کش‌های عمومی
  await invalidatePublicData();
  await invalidateHomePageData();
}

// گرفتن آمار کش
export function getStats() {
  return cacheManager.getStats();
}
