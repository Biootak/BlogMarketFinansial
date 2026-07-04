'use server';

import { revalidatePath } from 'next/cache';
import { revalidateTag } from '@/lib/revalidate';

export async function invalidateUserCache(userId: string) {
  revalidateTag(`user-${userId}`);
  revalidateTag('user-posts');
  revalidateTag('user-comments');
  revalidateTag('user-likes');
  revalidateTag('user-subscription');
  revalidateTag('user-billing');
  revalidateTag(`dashboard-user-${userId}`);
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/edit-profile');
  revalidatePath('/dashboard/subscription');
  revalidatePath('/dashboard/billing-address');
  await invalidateSidebarCache();
}

export async function invalidatePublicCache() {
  revalidateTag('posts');
  revalidateTag('archive');
  revalidateTag('categories');
  revalidateTag('tags');
  revalidateTag('comments');
  await invalidateSidebarCache();
}

export async function invalidateHomePageCache() {
  // 2026-06-19: `posts` is the umbrella tag that getLatestPosts,
  // getPublishedPostCount, getPosts (gallery) and getFeaturedPosts all
  // listen on. Without busting it, a freshly published post stays stale
  // on the home page for up to 60s.
  revalidateTag('posts');
  revalidateTag('featured-posts');
  revalidateTag('latest-posts');
  revalidateTag('popular-posts');
  revalidateTag('gallery-posts');
  revalidateTag('top-authors');
}

export async function invalidatePostCache(postId: string) {
  revalidateTag(`post-${postId}`);
  revalidateTag('post-slug');
  revalidateTag('posts');
  revalidateTag('archive');
  revalidateTag('comments');
  revalidateTag('dashboard-stats');
}

export async function invalidateSidebarCache() {
  revalidateTag('sidebar-data');
  revalidateTag('sidebar-posts');
  revalidateTag('sidebar-tags');
  revalidateTag('sidebar-categories');
  revalidateTag('sidebar-authors');
  revalidateTag('sidebar-ads');
}

export async function invalidateDashboardCache() {
  revalidateTag('dashboard');
  revalidateTag('dashboard-posts');
  revalidateTag('dashboard-categories');
  revalidateTag('dashboard-users');
  revalidateTag('dashboard-reports');
  revalidateTag('dashboard-settings');
  revalidateTag('dashboard-advertisements');
  revalidateTag('dashboard-exchange-rates');
  revalidateTag('dashboard-credit-rates');
  revalidateTag('dashboard-rate-lists');
  revalidateTag('dashboard-subscription');
  revalidateTag('dashboard-stats');

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
