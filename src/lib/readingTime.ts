import type { PostWithRelations } from '@/types/types';

/**
 * تخمین زمان مطالعه (دقیقه) از روی excerpt — وقتی فیلد readingTime در DB
 * صفر/نامعتبر باشه استفاده می‌شه. HTML tags حذف و کلمات شمرده می‌شن.
 */
function estimateFromExcerpt(excerpt: string | undefined | null): number {
  if (!excerpt) return 3;
  const words = excerpt
    .replace(/<[^>]+>/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  if (words === 0) return 3;
  return Math.max(2, Math.round(words / 150));
}

/**
 * زمان مطالعه‌ی یک پست به دقیقه.
 *
 * منبع اصلی: فیلد `readingTime` (Int) که در DB ذخیره می‌شه.
 * fallback: تخمین از `excerpt`.
 *
 * نکته: عمداً به `post.content` تکیه نمی‌کنیم چون query های لیست (getPosts,
 * getLatestPosts, getFeaturedPosts) با `omit: { content: true }` بدنه‌ی کامل
 * مقاله رو حذف می‌کنن تا payload صفحه سبک بمونه؛ پس content در کارت‌ها
 * undefined هست.
 */
export function getReadingMinutes(
  post: Pick<PostWithRelations, 'readingTime' | 'excerpt'>,
): number {
  if (typeof post.readingTime === 'number' && post.readingTime > 0) {
    return post.readingTime;
  }
  return estimateFromExcerpt(post.excerpt);
}
