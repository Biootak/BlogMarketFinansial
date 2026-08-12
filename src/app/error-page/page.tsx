'use client';

/**
 * /error-page — صفحهٔ مستقل «خطای عمومی» (پیش‌نمایش طراحی RouteError شیشه‌ای).
 *
 * همان کامپوننت مشترک خطا را با یک خطای نمونهٔ سرور (۵۰۰) نمایش می‌دهد تا
 * بدون وقوع خطای واقعی دیده شود. `reportToSentry={false}` — خطای ساختگی نباید
 * در Sentry ثبت شود.
 *
 * توجه: مسیر `/error` رزروی Auth.js است و کاربران لاگین‌شده را به داشبورد
 * ریدایرکت می‌کند — برای همین پیش‌نمایش روی مسیر جداگانهٔ `/error-page`
 * قرار گرفته و راهنمای سایت هم به همین مسیر لینک می‌دهد.
 */

import { RouteError } from '@/components/Dashboard/primitives';
import { useRouter } from 'next/navigation';

export default function ErrorPage() {
  const router = useRouter();

  return (
    <RouteError
      reportToSentry={false}
      error={new Error('Server error while loading the page')}
      reset={() => router.refresh()}
      section="صفحه"
      backHref="/dashboard"
      backLabel="داشبورد"
    />
  );
}
