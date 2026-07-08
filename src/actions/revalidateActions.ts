'use server';

import { revalidateTag } from '@/lib/revalidate';
import { requireSuperAdmin, authFailureToActionResult } from '@/lib/require-auth';

// C4 fix: every revalidation action is a cache-busting, DB/upstream-pressure
// operation. Gate them behind SUPER_ADMIN so an anonymous caller cannot
// trigger a cache stampede / DoS.
function assertAuth() {
  return requireSuperAdmin().then((r) =>
    r.success ? null : authFailureToActionResult(r),
  );
}

export async function revalidateCategoryCache(categoryId: string) {
  const authError = await assertAuth();
  if (authError) return authError;
  try {
    if (categoryId === 'list') {
      revalidateTag('categories');
      revalidateTag('category-list');
      revalidateTag('latest-post-categories');
      // 2026-06-14: archive list is filtered by category slug, so any
      // category write must bust the archive too.
      revalidateTag('archive');
    } else {
      revalidateTag(`category-${categoryId}`);
      revalidateTag('categories');
      revalidateTag('archive');
    }
    return { success: true };
  } catch (error) {
    console.error('Error revalidating category cache:', error);
    return { success: false, error };
  }
}

export async function revalidatePostCache(postId?: string) {
  const authError = await assertAuth();
  if (authError) return authError;
  try {
    if (postId) {
      revalidateTag(`post-${postId}`);
    }

    // 2026-06-14: drop the 'page' profile arg. unstable_cache is the
    // Data Cache, not the page-level `fetch` cache, so the explicit
    // profile was wrong and silently no-op'd. The single-arg form
    // busts every tag below correctly.
    revalidateTag('posts');
    revalidateTag('post-slug');
    revalidateTag('archive');
    revalidateTag('gallery-posts');
    revalidateTag('latest-posts');
    revalidateTag('featured-posts');
    revalidateTag('popular-posts');
    revalidateTag('dashboard-stats');

    return { success: true };
  } catch (error) {
    console.error('Error revalidating post cache:', error);
    return { success: false, error };
  }
}

export async function revalidateSettingsCache() {
  const authError = await assertAuth();
  if (authError) return authError;
  try {
    revalidateTag('system-settings');
    return { success: true };
  } catch (error) {
    console.error('Error revalidating settings cache:', error);
    return { success: false, error };
  }
}

export async function revalidateAdvertisementsCache() {
  const authError = await assertAuth();
  if (authError) return authError;
  try {
    revalidateTag('advertisements');
    return { success: true };
  } catch (error) {
    console.error('Error revalidating advertisements cache:', error);
    return { success: false, error };
  }
}

export async function revalidateAllCache() {
  const authError = await assertAuth();
  if (authError) return authError;
  try {
    revalidateTag('posts');
    revalidateTag('post-slug');
    revalidateTag('archive');
    revalidateTag('gallery-posts');
    revalidateTag('latest-posts');
    revalidateTag('featured-posts');
    revalidateTag('popular-posts');
    revalidateTag('categories');
    revalidateTag('category-list');
    revalidateTag('latest-post-categories');
    revalidateTag('tags');
    revalidateTag('sidebar-data');
    revalidateTag('sidebar-posts');
    revalidateTag('sidebar-tags');
    revalidateTag('sidebar-categories');
    revalidateTag('sidebar-authors');
    revalidateTag('sidebar-ads');
    revalidateTag('system-settings');
    revalidateTag('advertisements');
    revalidateTag('market-rates:ticker');
    revalidateTag('market-rates:exchange-rates');
    revalidateTag('dashboard-stats');
    return { success: true };
  } catch (error) {
    console.error('Error revalidating all cache:', error);
    return { success: false, error };
  }
}
