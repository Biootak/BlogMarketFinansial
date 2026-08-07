import type { ReactNode } from 'react';

import { getObservabilitySnapshot } from '@/lib/observability';

import { ObsProvider } from './_components/ObsProvider';
import { ObsPulseDeck } from './_components/ObsPulseDeck';
import { ObsSubNav } from './_components/ObsSubNav';
import { ObsToolbar } from './_components/ObsToolbar';
import { requireObservabilityAccess } from './_lib/guard';
import s from './observability.module.css';

export const dynamic = 'force-dynamic';

/**
 * پوستهٔ مشترک همهٔ زیرمسیرهای مشاهده‌پذیری.
 *
 * داده یک‌بار اینجا خوانده می‌شود و از طریق ObsProvider بین زیرمسیرها به
 * اشتراک می‌رود؛ جابه‌جایی بین تب‌ها هیچ درخواست تازه‌ای نمی‌زند و مکان‌نمای
 * ساعت هم بین تب‌ها حفظ می‌شود.
 *
 * ObsPulseDeck عمداً در layout است نه در page: «حال سامانه» زمینهٔ همهٔ
 * تب‌هاست، پس نباید با هر ناوبری unmount و دوباره رسم شود.
 *
 * تیتر صفحه اینجا نیست و نباید باشد: RouteFrame (در پوستهٔ داشبورد) برای هر
 * مسیر h1 و breadcrumb می‌سازد. سلسله‌مراتب نهایی: h1 از RouteFrame، h2 عنوان
 * تب در هر page، h3 عنوان هر مدخل در ObsSection.
 *
 * main هم دیگر گرید نیست. قبلاً هم پوسته یک گرید ۱۲ ستونی داشت و هم هر صفحه
 * گرید خودش را می‌ساخت؛ نتیجه دو گرید تودرتو بود که span ها را بی‌اثر می‌کرد.
 */
export default async function ObservabilityLayout({ children }: { children: ReactNode }) {
  await requireObservabilityAccess();

  const result = await getObservabilitySnapshot();
  const initialData = result.success && result.data ? result.data : null;

  return (
    <div className={s.page}>
      <ObsProvider initialData={initialData}>
        <div className={s.command}>
          <ObsSubNav />
          <ObsToolbar />
        </div>

        <ObsPulseDeck />

        <main className={s.main}>{children}</main>
      </ObsProvider>
    </div>
  );
}
