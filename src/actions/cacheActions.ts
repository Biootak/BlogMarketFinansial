'use server';

import { revalidateTag, revalidatePath } from 'next/cache';

export async function invalidateUserCache(userId: string) {
  revalidateTag(`user-${userId}`, 'page');
  revalidateTag('user-posts', 'page');
  revalidateTag('user-comments', 'page');
  revalidateTag('user-likes', 'page');
  revalidateTag('user-subscription', 'page');
  revalidateTag('user-billing', 'page');
  // اضافه کردن کش داشبورد کاربر
  revalidateTag(`dashboard-user-${userId}`, 'page');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/edit-profile');
  revalidatePath('/dashboard/subscription');
  revalidatePath('/dashboard/billing-address');
  await invalidateSidebarCache();
}

export async function invalidatePublicCache() {
  revalidateTag('posts', 'page');
  revalidateTag('categories', 'page');
  revalidateTag('tags', 'page');
  revalidateTag('comments', 'page');
  await invalidateSidebarCache();
}

export async function invalidateHomePageCache() {
  revalidateTag('featured-posts', 'page');
  revalidateTag('latest-posts', 'page');
  revalidateTag('popular-posts', 'page');
}

export async function invalidatePostCache(postId: string) {
  revalidateTag(`post-${postId}`, 'page');
  revalidateTag('posts', 'page');
  revalidateTag('comments', 'page');
}

export async function invalidateSidebarCache() {
  // کش داده‌های ساید بار
  revalidateTag('sidebar-data', 'page');
  revalidateTag('sidebar-posts', 'page');
  revalidateTag('sidebar-tags', 'page');
  revalidateTag('sidebar-categories', 'page');
  revalidateTag('sidebar-authors', 'page');
  revalidateTag('sidebar-ads', 'page');
}

export async function invalidateDashboardCache() {
  // کش صفحات داشبورد
  revalidateTag('dashboard', 'page');
  revalidateTag('dashboard-posts', 'page');
  revalidateTag('dashboard-categories', 'page');
  revalidateTag('dashboard-users', 'page');
  revalidateTag('dashboard-reports', 'page');
  revalidateTag('dashboard-settings', 'page');
  revalidateTag('dashboard-advertisements', 'page');
  revalidateTag('dashboard-exchange-rates', 'page');
  revalidateTag('dashboard-credit-rates', 'page');
  revalidateTag('dashboard-rate-lists', 'page');
  revalidateTag('dashboard-subscription', 'page');
  
  // کش مسیرها
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/posts');
  revalidatePath('/dashboard/categories');
  revalidatePath('/dashboard/users');
  revalidatePath('/dashboard/reports');
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/advertisements');
  revalidatePath('/dashboard/exchange-rates');
  revalidatePath('/dashboard/credit-rates');
  revalidatePath('/dashboard/rate-lists');
  revalidatePath('/dashboard/subscription');
  revalidatePath('/dashboard/billing-address');
  revalidatePath('/dashboard/edit-profile');
  await invalidateSidebarCache();
}
