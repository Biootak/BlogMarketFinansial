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
 * اشتراک می‌رود؛ جابه‌جایی بین تب‌ها هیچ درخواست تازه‌ای نمی‌زند.
 *
 * ObsPulseDeck هم عمداً در layout است نه در page: «حال سامانه» زمینهٔ همهٔ
 * تب‌هاست، پس نباید با هر ناوبری unmount و دوباره رسم شود.
 *
 * تیتر صفحه اینجا نیست و نباید باشد: RouteFrame (در پوستهٔ داشبورد) برای هر
 * مسیر خودش h1 و breadcrumb و توضیح را می‌سازد. قبلاً اینجا یک PageHeader دوم
 * هم رندر می‌شد که نتیجه‌اش دو تیتر تکراری و دو h1 روی یک صفحه بود — هم
 * بصری غلط، هم شکستن ساختار heading برای screen reader. متن مرجع (منشأ اعداد)
 * به META همان RouteFrame منتقل شد تا چیزی از دست نرود.
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
