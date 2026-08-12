/**
 * /exchange/audit — سوابق عملیات صرافی
 *
 * «چه کسی، چه کاری، کی انجام داد» — از AuditLog.
 * داده و کامپوننت فید از زیرساخت موجود staff/activity بازاستفاده می‌شود
 * (getStaffActivity + StaffActivityFeed) — بدون کد تکراری.
 */

import { getStaffActivity } from '@/actions/exchanges';
import { getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import AuditWorkspace from './_components/AuditWorkspace';

export const metadata: Metadata = {
  title: 'سوابق عملیات | پنل صرافی',
  description: 'لاگ ممیزی اقدامات کارکنان صرافی',
};

export default async function AuditPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/audit');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/forbidden');

  const { exchange } = membership;
  const activity = await getStaffActivity(exchange.id, 120);

  return (
    <Suspense fallback={null}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-5)' }}>
        <PageHeader
          accent="emerald"
          eyebrow="صرافی · انطباق"
          title="سوابق عملیات"
          description={`لاگ ممیزی اقدامات تیم — ${activity.length} رویداد اخیر`}
          breadcrumb={[{ label: 'پنل صرافی' }, { label: 'سوابق عملیات' }]}
          icon="clipboard-list"
        />
        <AuditWorkspace items={activity} />
      </div>
    </Suspense>
  );
}
