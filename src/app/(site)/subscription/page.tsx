import { redirect } from 'next/navigation';

/**
 * /subscription — صفحه‌ی فهرست اشتراک‌ها.
 * لینک‌های «اشتراک‌ها» در PlanDetailClient به اینجا می‌آیند.
 * چون هر پلن مسیر خودش را دارد (free/pro/business)، اینجا به پلن
 * پیش‌فرض (free) هدایت می‌شود.
 */
export default function SubscriptionIndexPage() {
  redirect('/subscription/free');
}
