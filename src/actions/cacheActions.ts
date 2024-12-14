'use server';

import { revalidateTag, revalidatePath } from 'next/cache';

export async function invalidateUserCache(userId: string) {
  await revalidateTag(`user-${userId}`);
  await revalidateTag('user-posts');
  await revalidateTag('user-comments');
  await revalidateTag('user-likes');
  await revalidateTag('user-subscription');
  await revalidateTag('user-billing');
  // اضافه کردن کش داشبورد کاربر
  await revalidateTag(`dashboard-user-${userId}`);
  await revalidatePath('/dashboard');
  await revalidatePath('/dashboard/edit-profile');
  await revalidatePath('/dashboard/subscription');
  await revalidatePath('/dashboard/billing-address');
  await invalidateSidebarCache();
}

export async function invalidatePublicCache() {
  await revalidateTag('posts');
  await revalidateTag('categories');
  await revalidateTag('tags');
  await revalidateTag('comments');
  await invalidateSidebarCache();
}

export async function invalidateHomePageCache() {
  await revalidateTag('featured-posts');
  await revalidateTag('latest-posts');
  await revalidateTag('popular-posts');
}

export async function invalidatePostCache(postId: string) {
  await revalidateTag(`post-${postId}`);
  await revalidateTag('posts');
  await revalidateTag('comments');
}

export async function invalidateSidebarCache() {
  // کش داده‌های ساید بار
  await revalidateTag('sidebar-data');
  await revalidateTag('sidebar-posts');
  await revalidateTag('sidebar-tags');
  await revalidateTag('sidebar-categories');
  await revalidateTag('sidebar-authors');
  await revalidateTag('sidebar-ads');
}

export async function invalidateDashboardCache() {
  // کش صفحات داشبورد
  await revalidateTag('dashboard');
  await revalidateTag('dashboard-posts');
  await revalidateTag('dashboard-categories');
  await revalidateTag('dashboard-users');
  await revalidateTag('dashboard-reports');
  await revalidateTag('dashboard-settings');
  await revalidateTag('dashboard-advertisements');
  await revalidateTag('dashboard-exchange-rates');
  await revalidateTag('dashboard-credit-rates');
  await revalidateTag('dashboard-rate-lists');
  await revalidateTag('dashboard-subscription');
  
  // کش مسیرها
  await revalidatePath('/dashboard');
  await revalidatePath('/dashboard/posts');
  await revalidatePath('/dashboard/categories');
  await revalidatePath('/dashboard/users');
  await revalidatePath('/dashboard/reports');
  await revalidatePath('/dashboard/settings');
  await revalidatePath('/dashboard/advertisements');
  await revalidatePath('/dashboard/exchange-rates');
  await revalidatePath('/dashboard/credit-rates');
  await revalidatePath('/dashboard/rate-lists');
  await revalidatePath('/dashboard/subscription');
  await revalidatePath('/dashboard/billing-address');
  await revalidatePath('/dashboard/edit-profile');
  await invalidateSidebarCache();
}
