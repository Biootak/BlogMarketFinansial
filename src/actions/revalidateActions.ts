'use server';

import { revalidateTag } from 'next/cache';

export async function revalidateCategoryCache(categoryId: string) {
  try {
    if (categoryId === 'list') {
      await revalidateTag('categories');
      await revalidateTag('category-list');
    } else {
      await revalidateTag(`category-${categoryId}`);
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
      await revalidateTag(`post-${postId}`);
    }
    
    // همیشه تگ‌های عمومی پست‌ها را revalidate می‌کنیم
    await revalidateTag('posts');
    await revalidateTag('post-list');
    await revalidateTag('latest-posts');
    await revalidateTag('featured-posts');
    
    return { success: true };
  } catch (error) {
    console.error('Error revalidating post cache:', error);
    return { success: false, error };
  }
}
