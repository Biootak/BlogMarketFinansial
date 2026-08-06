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
      <div className={s.masthead}>
        <PageHeader
          variant="minimal"
          eyebrow="مرکز عملیات"
          title="مرکز مشاهده‌پذیری"
          description="یک سطح تصمیم‌گیری برای فهمیدن چه چیزی تغییر کرده، کجا باید رفت و کدام عدد واقعاً از لاگ‌های تولید آمده است."
          icon="radar"
          accent="emerald"
          breadcrumb={[{ href: '/dashboard', label: 'داشبورد' }, { label: 'مشاهده‌پذیری' }]}
        />
      </div>

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
