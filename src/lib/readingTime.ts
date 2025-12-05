/**
 * Calculate reading time for post content
 * محاسبه زمان مطالعه محتوا
 */

const WORDS_PER_MINUTE = 200; // میانگین سرعت خواندن (کلمه در دقیقه)

/**
 * Remove HTML tags from content
 * حذف تگ‌های HTML از محتوا
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Count words in text
 * شمارش کلمات در متن
 */
function countWords(text: string): number {
  // برای زبان فارسی و انگلیسی
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  return words.length;
}

/**
 * Calculate reading time in minutes
 * محاسبه زمان مطالعه به دقیقه
 * 
 * @param content - HTML content of the post
 * @returns Reading time in minutes (minimum 1)
 */
export function calculateReadingTime(content: string): number {
  if (!content || content.trim().length === 0) {
    return 1;
  }

  // حذف HTML tags
  const plainText = stripHtml(content);

  // شمارش کلمات
  const wordCount = countWords(plainText);

  // محاسبه زمان مطالعه
  const minutes = Math.ceil(wordCount / WORDS_PER_MINUTE);

  // حداقل 1 دقیقه
  return Math.max(1, minutes);
}

/**
 * Format reading time for display
 * فرمت زمان مطالعه برای نمایش
 */
export function formatReadingTime(minutes: number): string {
  if (minutes < 1) {
    return 'کمتر از یک دقیقه';
  }
  if (minutes === 1) {
    return '۱ دقیقه';
  }
  return `${minutes} دقیقه`;
}
