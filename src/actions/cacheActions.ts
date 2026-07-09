'use server';

import { revalidatePath } from 'next/cache';
import { revalidateTag } from '@/lib/revalidate';
import { safeRevalidateTag } from '@/lib/safe-cache';

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
  revalidateTag('system-settings');
  revalidateTag('transfer-providers');
  revalidateTag('money-transfer');
  revalidateTag('rate-lists');
  safeRevalidateTag('system-settings');
  safeRevalidateTag('transfer-providers');
  safeRevalidateTag('money-transfer');
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
  // 2026-07-08: also purge the in-memory safeCache slots (H5).
  safeRevalidateTag('posts');
  safeRevalidateTag('featured-posts');
  safeRevalidateTag('latest-posts');
  safeRevalidateTag('popular-posts');
  safeRevalidateTag('gallery-posts');
  safeRevalidateTag('top-authors');
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
  // 2026-07-09: purge the actual safeCache tags produced by
  // `sidebarActions` (`recent-posts`, `popular-tags`, `popular-categories`,
  // `popular-authors`). The previous `sidebar-*` keys never matched any
  // producer, so the sidebar stayed stale up to its 3600s TTL after publish.
  revalidateTag('recent-posts');
  revalidateTag('popular-tags');
  revalidateTag('popular-categories');
  revalidateTag('popular-authors');
  safeRevalidateTag('recent-posts');
  safeRevalidateTag('popular-tags');
  safeRevalidateTag('popular-categories');
  safeRevalidateTag('popular-authors');
  revalidateTag('sidebar-data');
  revalidateTag('sidebar-posts');
  revalidateTag('sidebar-tags');
  revalidateTag('sidebar-categories');
  revalidateTag('sidebar-authors');
  revalidateTag('sidebar-ads');
  // 2026-07-08: also purge the in-memory safeCache slots (H5).
  safeRevalidateTag('sidebar-data');
  safeRevalidateTag('sidebar-posts');
  safeRevalidateTag('sidebar-tags');
  safeRevalidateTag('sidebar-categories');
  safeRevalidateTag('sidebar-authors');
  safeRevalidateTag('sidebar-ads');
  safeRevalidateTag('top-authors');
  safeRevalidateTag('rate-lists');
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
