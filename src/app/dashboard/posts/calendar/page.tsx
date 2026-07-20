import { getScheduledPosts } from '@/actions/postActions';
import AtelierMonthCalendar from '@/components/Dashboard/DashboardPage/atelier/tiles/AtelierMonthCalendar';
import { checkRole } from '@/lib/auth';

/**
 * /dashboard/posts/calendar — تقویم انتشار ماهانه به‌عنوان صفحهٔ مستقل.
 *
 * 2026-07-04 (late night): صفحهٔ مستقل دوباره فعال شد. نسخهٔ قبلی به‌خاطر
 * نبودن لینک ورودی به صفحه (orphan) حذف شده بود؛ حالا با بازگرداندن
 * این صفحه + لینک «تقویم کامل» در `AtelierWeekRhythm` که از anchor
 * `/dashboard#at-calendar` به این مسیر اشاره می‌کند، orphan بودن
 * برطرف شده. هم‌خانواده با `AtelierDeck` از نظر داده (هر دو از
 * `getScheduledPosts` می‌خوانند) ولی مستقل از نظر UI چون
 * `AtelierMonthCalendar` با `embedded=false` کارت‌های مستقل و
 * دکمهٔ «بازگشت به داشبورد» نشان می‌دهد.
 */
export const dynamic = 'force-dynamic';

export default async function PostsCalendarPage() {
  await checkRole(['OWNER', 'ADMIN', 'AUTHOR']);

  const result = await getScheduledPosts();

  if (!result.success || !Array.isArray(result.data)) {
    return (
      <div className="at-cal-page">
        <div className="at-cal__empty">
          <p>خطا در دریافت برنامهٔ انتشار.</p>
          <p className="at-cal__empty-hint">لطفاً صفحه را تازه‌سازی کنید.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="at-cal-page">
      <AtelierMonthCalendar scheduledPosts={result.data} />
    </div>
  );
}
