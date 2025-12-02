'use server';

import { revalidateTag } from 'next/cache';

export async function revalidateCategoryCache(categoryId: string) {
  try {
    if (categoryId === 'list') {
      revalidateTag('categories', 'page');
      revalidateTag('category-list', 'page');
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
    // اگر postId داده شده باشد، فقط همان پست را revalidate می‌کنیم
    if (postId) {
      revalidateTag(`post-${postId}`, 'page');
    }
    
    // همیشه تگ‌های عمومی پست‌ها را revalidate می‌کنیم
    revalidateTag('posts', 'page');
    revalidateTag('post-list', 'page');
    revalidateTag('latest-posts', 'page');
    revalidateTag('featured-posts', 'page');
    
    return { success: true };
  } catch (error) {
    console.error('Error revalidating post cache:', error);
    return { success: false, error };
  }
}
