'use server';

import { revalidateTag } from 'next/cache';

export async function revalidateCategoryCache(categoryId: string) {
  try {
    if (categoryId === 'list') {
      revalidateTag('categories', 'page');
      revalidateTag('category-list', 'page');
      revalidateTag('latest-post-categories', 'page');
    } else {
      revalidateTag(`category-${categoryId}`, 'page');
    }
    return { success: true };
  } catch (error) {
    console.error('Error revalidating category cache:', error);
    return { success: false, error };
  }
}

export async function revalidatePostCache(postId?: string) {
  try {
    if (postId) {
      revalidateTag(`post-${postId}`, 'page');
    }

    revalidateTag('posts', 'page');
    revalidateTag('gallery-posts', 'page');
    revalidateTag('latest-posts', 'page');
    revalidateTag('featured-posts', 'page');

    return { success: true };
  } catch (error) {
    console.error('Error revalidating post cache:', error);
    return { success: false, error };
  }
}

export async function revalidateSettingsCache() {
  try {
    revalidateTag('system-settings', 'page');
    return { success: true };
  } catch (error) {
    console.error('Error revalidating settings cache:', error);
    return { success: false, error };
  }
}

export async function revalidateAdvertisementsCache() {
  try {
    revalidateTag('advertisements', 'page');
    return { success: true };
  } catch (error) {
    console.error('Error revalidating advertisements cache:', error);
    return { success: false, error };
  }
}

export async function revalidateAllCache() {
  try {
    revalidateTag('posts', 'page');
    revalidateTag('gallery-posts', 'page');
    revalidateTag('latest-posts', 'page');
    revalidateTag('featured-posts', 'page');
    revalidateTag('categories', 'page');
    revalidateTag('system-settings', 'page');
    revalidateTag('advertisements', 'page');
    return { success: true };
  } catch (error) {
    console.error('Error revalidating all cache:', error);
    return { success: false, error };
  }
}
