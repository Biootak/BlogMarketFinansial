import type { ReactNode } from 'react';

import { PageHeader } from '@/components/Dashboard/primitives';
import { getObservabilitySnapshot } from '@/lib/observability';

import { ObsProvider } from './_components/ObsProvider';
import { ObsSubNav } from './_components/ObsSubNav';
import { ObsToolbar } from './_components/ObsToolbar';
import { SystemVitals } from './_components/SystemVitals';
import { requireObservabilityAccess } from './_lib/guard';
import s from './observability.module.css';

export const dynamic = 'force-dynamic';

/**
 * پوستهٔ مشترک همهٔ زیرمسیرهای مشاهده‌پذیری.
 * داده یک‌بار اینجا خوانده می‌شود و از طریق ObsProvider بین زیرمسیرها
 * به اشتراک می‌رود؛ جابه‌جایی بین تب‌ها هیچ درخواست تازه‌ای نمی‌زند.
 */
export default async function ObservabilityLayout({ children }: { children: ReactNode }) {
  await requireObservabilityAccess();

  const result = await getObservabilitySnapshot();
  const initialData = result.success && result.data ? result.data : null;

  return (
    <div className={s.page}>
      <PageHeader
        variant="minimal"
        eyebrow="مرکز عملیات"
        title="مرکز مشاهده‌پذیری"
        description="سلامت سرویس‌ها، تأخیر، خطا و رد ممیزی — هر عدد مستقیم از SystemLog و AuditLog خوانده می‌شود."
        icon="radar"
        accent="emerald"
        breadcrumb={[{ href: '/dashboard', label: 'داشبورد' }, { label: 'مشاهده‌پذیری' }]}
      />

      <ObsProvider initialData={initialData}>
        <div className={s.bar}>
          <ObsSubNav />
          <ObsToolbar />
        </div>

        <div className={s.shell}>
          <main className={s.main}>{children}</main>
          <aside className={s.rail} aria-label="نشانه‌های حیاتی سامانه">
            <SystemVitals />
          </aside>
        </div>
      </ObsProvider>
    </div>
  );
}
