import { redirect } from 'next/navigation';

/**
 * تبلیغ هدر اکنون در صفحه مدیریت تبلیغات یکپارچه شده است.
 * این مسیر برای حفظ bookmarkهای قبلی به تب «تبلیغ هدر» ریدایرکت می‌شود.
 */
export default function HeaderAdsPage() {
  redirect('/dashboard/advertisements?tab=header');
}
