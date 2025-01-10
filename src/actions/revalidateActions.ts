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
