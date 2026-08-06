import type { ReactNode } from 'react';

import { PageHeader } from '@/components/Dashboard/primitives';
import { getObservabilitySnapshot } from '@/lib/observability';

import { ObsProvider } from './_components/ObsProvider';
import { ObsPulseDeck } from './_components/ObsPulseDeck';
import { ObsSubNav } from './_components/ObsSubNav';
import { ObsToolbar } from './_components/ObsToolbar';
import { requireObservabilityAccess } from './_lib/guard';
import s from './observability.module.css';

export const dynamic = 'force-dynamic';

export default async function ObservabilityLayout({ children }: { children: ReactNode }) {
  await requireObservabilityAccess();
  const result = await getObservabilitySnapshot();
  const initialData = result.success && result.data ? result.data : null;

  return (
    <div className={s.page}>
      <PageHeader
        variant="minimal"
        eyebrow="عملیات / سیگنال زنده"
        title="اطلس مشاهده‌پذیری"
        description="یک سطح عملیاتی برای دیدن سلامت واقعی سامانه، فهمیدن علت، و رسیدن به ردپای قابل اقدام."
        icon="radar"
        accent="emerald"
        breadcrumb={[{ href: '/dashboard', label: 'داشبورد' }, { label: 'مشاهده‌پذیری' }]}
      />

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
