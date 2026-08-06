import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import { ObservabilityNav } from './_components/ObservabilityNav';
import s from './observability.module.css';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['OWNER', 'SUPERADMIN', 'ADMIN'];

/**
 * قاب مشترک مرکز مشاهده‌پذیری.
 *
 *  کنترل دسترسی یک‌بار اینجا انجام می‌شود و همهٔ زیرمسیرها را می‌پوشاند.
 *  لایهٔ دوم دفاع داخل `getObservabilitySnapshot` است که خودش نقش را دوباره
 *  بررسی می‌کند، پس درخواست مستقیم به RSC هم بی‌داده برمی‌گردد.
 */
export default async function ObservabilityLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/dashboard/observability');
  }
  if (!ALLOWED_ROLES.includes(session.user.role ?? '')) {
    redirect('/dashboard?error=forbidden');
  }

  return (
    <div dir="rtl" className={s.page}>
      <PageHeader
        variant="minimal"
        eyebrow="مرکز عملیات"
        title="مرکز مشاهده‌پذیری"
        description="سلامت سرویس‌ها، خطاها، تأخیر و رخدادها — همهٔ اعداد از SystemLog و AuditLog خوانده می‌شوند."
        icon="radar"
        accent="cyan"
        breadcrumb={[{ href: '/dashboard', label: 'داشبورد' }, { label: 'مرکز پایش' }]}
      />
      <ObservabilityNav />
      <div className={s.body}>{children}</div>
    </div>
  );
}
