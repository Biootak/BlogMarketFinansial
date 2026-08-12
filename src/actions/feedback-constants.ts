/**
 * feedback-constants — ثابت‌های وضعیت بازخوردها.
 *
 * جدا از feedback-actions.ts نگه داشته شده چون فایل‌های 'use server' فقط
 * اجازهٔ export تابع async دارند و کلاینت به این برچسب‌ها نیاز دارد.
 */

/**
 * وضعیت‌های مجاز گردش کار — ترتیب نمایش در UI.
 * IN_PROGRESS و RESOLVED از نسخه‌های قدیمی‌تر اپ در داده‌ها باقی مانده‌اند؛
 * بدون این دو، آن رکوردها به‌اشتباه «جدید» نمایش داده می‌شدند.
 */
export const FEEDBACK_STATUSES = [
  'NEW',
  'READ',
  'IN_PROGRESS',
  'REPLIED',
  'RESOLVED',
  'ARCHIVED',
] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  NEW: 'جدید',
  READ: 'خوانده‌شده',
  IN_PROGRESS: 'در حال بررسی',
  REPLIED: 'پاسخ داده شده',
  RESOLVED: 'حل‌شده',
  ARCHIVED: 'بایگانی',
};
