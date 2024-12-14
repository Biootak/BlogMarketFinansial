import { revalidateTag } from 'next/cache';
import cacheManager from '@/utils/cache';
import { CACHE_CONFIG } from '@/config/cacheConfig';

// Types
export interface Post {
  id: string;
  title: string;
  content: string;
  // سایر فیلدهای پست
}

export interface Category {
  id: string;
  name: string;
  // سایر فیلدهای دسته‌بندی
}

export interface Comment {
  id: string;
  content: string;
  postId: string;
  // سایر فیلدهای نظر
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  // سایر فیلدهای پروفایل
}

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  volume: number;
  // سایر فیلدهای داده‌های بازار
}

export type UserRole = 'USER' | 'AUTHOR' | 'ADMIN' | 'SUPER_ADMIN';

// مدیریت کش پست‌ها
export async function cachePost(postId: string, data: Post): Promise<void> {
  const tags = ['posts', `post-${postId}`];
  await cacheManager.set(CACHE_CONFIG.KEYS.POSTS.DETAIL(postId), data, 'POSTS', tags);
}

export async function getCachedPost(postId: string, fetcher?: () => Promise<Post>): Promise<Post | null> {
  if (fetcher) {
    return cacheManager.getWithSWR(
      CACHE_CONFIG.KEYS.POSTS.DETAIL(postId),
      fetcher,
      { tags: ['posts', `post-${postId}`] }
    );
  }
  return cacheManager.get<Post>(CACHE_CONFIG.KEYS.POSTS.DETAIL(postId));
}

export async function invalidatePost(postId: string): Promise<void> {
  await revalidateTag(`post-${postId}`);
}

export async function invalidateAllPosts(): Promise<void> {
  await revalidateTag('posts');
}

// مدیریت کش دسته‌بندی‌ها
export async function cacheCategory(categoryId: string, data: Category): Promise<void> {
  const tags = ['categories', `category-${categoryId}`];
  await cacheManager.set(
    CACHE_CONFIG.KEYS.CATEGORIES.DETAIL(categoryId),
    data,
    'CATEGORIES',
    tags
  );
}

export async function getCachedCategory(categoryId: string, fetcher?: () => Promise<Category>): Promise<Category | null> {
  if (fetcher) {
    return cacheManager.getWithSWR(
      CACHE_CONFIG.KEYS.CATEGORIES.DETAIL(categoryId),
      fetcher,
      { tags: ['categories', `category-${categoryId}`] }
    );
  }
  return cacheManager.get<Category>(CACHE_CONFIG.KEYS.CATEGORIES.DETAIL(categoryId));
}

export async function invalidateCategory(categoryId: string): Promise<void> {
  await revalidateTag(`category-${categoryId}`);
}

export async function invalidateAllCategories(): Promise<void> {
  await revalidateTag('categories');
}

// مدیریت کش نظرات
export async function cacheComments(postId: string, data: Comment[]): Promise<void> {
  await cacheManager.set(CACHE_CONFIG.KEYS.COMMENTS.BY_POST(postId), data, 'COMMENTS');
}

export async function getCachedComments(postId: string): Promise<Comment[] | null> {
  return cacheManager.get<Comment[]>(CACHE_CONFIG.KEYS.COMMENTS.BY_POST(postId));
}

export async function invalidateComments(postId: string): Promise<void> {
  await cacheManager.delete(CACHE_CONFIG.KEYS.COMMENTS.BY_POST(postId));
}

// مدیریت کش پروفایل کاربر
export async function cacheUserProfile(userId: string, data: UserProfile): Promise<void> {
  await cacheManager.set(CACHE_CONFIG.KEYS.USER.PROFILE(userId), data, 'USER_PROFILE');
}

export async function getCachedUserProfile(userId: string): Promise<UserProfile | null> {
  return cacheManager.get<UserProfile>(CACHE_CONFIG.KEYS.USER.PROFILE(userId));
}

export async function invalidateUserProfile(userId: string): Promise<void> {
  await cacheManager.delete(CACHE_CONFIG.KEYS.USER.PROFILE(userId));
}

// مدیریت کش داده‌های کاربر
export async function invalidateUserData(userId: string): Promise<void> {
  await cacheManager.delete(CACHE_CONFIG.KEYS.USER.DATA(userId));
}

// مدیریت کش داده‌های عمومی
export async function invalidatePublicData(): Promise<void> {
  await cacheManager.delete(CACHE_CONFIG.KEYS.PUBLIC.DATA);
  await cacheManager.delete(CACHE_CONFIG.KEYS.PUBLIC.META);
  await cacheManager.delete(CACHE_CONFIG.KEYS.PUBLIC.SETTINGS);
}

// مدیریت کش داده‌های صفحه اصلی
export async function invalidateHomePageData(): Promise<void> {
  await cacheManager.delete(CACHE_CONFIG.KEYS.HOME_PAGE.BASIC_DATA);
}

// مدیریت کش داده‌های پست
export async function invalidatePostData(postId: string): Promise<void> {
  await cacheManager.delete(CACHE_CONFIG.KEYS.POSTS.DETAIL(postId));
}

// پاک کردن تمام کش‌های مربوط به نقش کاربر
export async function invalidateRoleBasedCache(role: UserRole): Promise<void> {
  // کش‌های مربوط به نقش نویسنده
  if (role === 'AUTHOR') {
    await cacheManager.delete('author-posts');
    await cacheManager.delete('author-dashboard');
  }
  // کش‌های مربوط به نقش ادمین
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    await cacheManager.delete('admin-dashboard');
    await cacheManager.delete('user-management');
    await cacheManager.delete('site-settings');
  }
  // کش‌های عمومی که ممکن است تحت تأثیر نقش کاربر باشند
  await cacheManager.delete('dashboard-data');
  await cacheManager.delete('user-permissions');
}

// پاک کردن تمام کش‌های مرتبط با کاربر
export async function invalidateAllUserRelatedCache(userId: string, role: UserRole): Promise<void> {
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

// Market Data Caching
export async function cacheMarketData(symbol: string, data: MarketData): Promise<void> {
  const tags = ['market', `market-${symbol}`];
  await cacheManager.set(
    CACHE_CONFIG.KEYS.MARKET.DETAIL(symbol),
    data,
    'MARKET_DATA',
    tags
  );
}

export async function getCachedMarketData(
  symbol: string,
  fetcher?: () => Promise<MarketData>
): Promise<MarketData | null> {
  if (fetcher) {
    return cacheManager.getWithSWR(
      CACHE_CONFIG.KEYS.MARKET.DETAIL(symbol),
      fetcher,
      { tags: ['market', `market-${symbol}`] }
    );
  }
  return cacheManager.get<MarketData>(CACHE_CONFIG.KEYS.MARKET.DETAIL(symbol));
}

export async function invalidateMarketData(symbol: string): Promise<void> {
  await revalidateTag(`market-${symbol}`);
}

export async function invalidateAllMarketData(): Promise<void> {
  await revalidateTag('market');
}

// پاک کردن کش‌های داشبورد
export async function invalidateDashboardCache(userId: string): Promise<void> {
  // پاک کردن کش‌های مرتبط با داشبورد کاربر
  await Promise.all([
    revalidateTag(CACHE_CONFIG.KEYS.USER.PROFILE(userId)),
    revalidateTag(CACHE_CONFIG.KEYS.USER.DATA(userId)),
    revalidateTag(CACHE_CONFIG.KEYS.MARKET.WATCHLIST(userId)),
    revalidateTag(CACHE_CONFIG.KEYS.MARKET.ALERTS(userId)),
    revalidateTag(CACHE_CONFIG.KEYS.HOME_PAGE.PAGE_DATA)
  ]);
}

// پاک کردن کش‌های نقش کاربر
export async function invalidateUserRoleCache(userId: string): Promise<void> {
  // پاک کردن کش‌های مرتبط با نقش کاربر
  await Promise.all([
    revalidateTag(CACHE_CONFIG.KEYS.USER.PROFILE(userId)),
    revalidateTag(CACHE_CONFIG.KEYS.USER.DATA(userId)),
    revalidateTag(`user:role:${userId}`), // تگ جدید برای نقش کاربر
    revalidateTag('user:roles'), // تگ عمومی برای کش‌های نقش
    revalidateTag('dashboard:menu'), // تگ جدید برای منوی داشبورد
    revalidateTag('dashboard:access') // تگ جدید برای دسترسی‌های داشبورد
  ]);
}

export async function clearAllUserRelatedCaches(userId: string): Promise<void> {
  // پاک کردن کامل کش‌های مرتبط با کاربر
  await Promise.all([
    invalidateUserProfile(userId),
    invalidateDashboardCache(userId),
    invalidateUserRoleCache(userId),
    revalidateTag(`user:full:${userId}`), // تگ کامل برای اطلاعات کاربر
    revalidateTag('users'),
    revalidateTag('user:sessions')
  ]);
}
