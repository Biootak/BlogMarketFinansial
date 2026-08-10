'use server';

import { revalidatePath, revalidateTag } from '@/lib/revalidate';
import { safeRevalidateTag } from '@/lib/safe-cache';
import { revalidateTag as redisRevalidateTag } from '@/lib/tiered-cache';

async function invalidateAllTiers(...tags: string[]) {
  for (const tag of tags) {
    revalidateTag(tag); // Next.js Data Cache
    safeRevalidateTag(tag); // L1 in-memory safeCache
    await redisRevalidateTag(tag); // L2 Redis
  }
}

export async function invalidateUserCache(userId: string) {
  await invalidateAllTiers(
    `user-${userId}`,
    'user-posts',
    'user-comments',
    'user-likes',
    'user-subscription',
    'user-billing',
    `dashboard-user-${userId}`,
  );
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/edit-profile');
  revalidatePath('/dashboard/subscription');
  revalidatePath('/dashboard/billing-address');
  await invalidateSidebarCache();
}

export async function invalidatePublicCache() {
  await invalidateAllTiers(
    'posts',
    'archive',
    'categories',
    'tags',
    'comments',
    'system-settings',
    'transfer-providers',
    'money-transfer',
    'rate-lists',
  );
  await invalidateSidebarCache();
}

export async function invalidateHomePageCache() {
  // 2026-06-19: `posts` is the umbrella tag that getLatestPosts,
  // getPublishedPostCount, getPosts (gallery) and getFeaturedPosts all
  // listen on. Without busting it, a freshly published post stays stale
  // on the home page for up to 60s.
  await invalidateAllTiers(
    'posts',
    'featured-posts',
    'latest-posts',
    'popular-posts',
    'gallery-posts',
    'top-authors',
    'recent-posts',
    'popular-categories-home',
  );
}

export async function invalidatePostCache(postId: string) {
  await invalidateAllTiers(
    `post-${postId}`,
    'post-slug',
    'posts',
    'archive',
    'comments',
    'dashboard-stats',
  );
}

export async function invalidateSidebarCache() {
  // 2026-07-09: purge the actual safeCache tags produced by
  // `sidebarActions` (`recent-posts`, `popular-tags`, `popular-categories`,
  // `popular-authors`). The previous `sidebar-*` keys never matched any
  // producer, so the sidebar stayed stale up to its 3600s TTL after publish.
  await invalidateAllTiers(
    'recent-posts',
    'popular-tags',
    'popular-categories',
    'popular-categories-home',
    'popular-authors',
    'sidebar-data',
    'sidebar-posts',
    'sidebar-tags',
    'sidebar-categories',
    'sidebar-authors',
    'sidebar-ads',
    'top-authors',
    'rate-lists',
    'crypto-rates',
  );
}

export async function invalidateDashboardCache() {
  await invalidateAllTiers(
    'dashboard',
    'dashboard-posts',
    'dashboard-categories',
    'dashboard-users',
    'dashboard-reports',
    'dashboard-settings',
    'dashboard-advertisements',
    'dashboard-exchange-rates',
    'dashboard-credit-rates',
    'dashboard-rate-lists',
    'dashboard-subscription',
    'dashboard-stats',
  );

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
