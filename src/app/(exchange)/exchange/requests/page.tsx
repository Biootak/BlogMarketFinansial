/**
 * /exchange/requests — کارتابل درخواست‌های مشتری صرافی
 *
 * داده: getExchangeRequests + getExchangeRequestStats (exchange-ops.ts)
 * اقدام: reviewExchangeRequest — تأیید/رد/لغو با statusLog + AuditLog
 */

import { getExchangeRequestStats, getExchangeRequests } from '@/actions/exchange-ops';
import { getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import RequestsWorkspace from './_components/RequestsWorkspace';

export const metadata: Metadata = {
  title: 'درخواست‌های مشتری | پنل صرافی',
  description: 'رسیدگی به درخواست‌های حساب، رفع مسدودی و افزایش سقف',
};

export default async function RequestsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/requests');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/forbidden');

  const { exchange } = membership;
  const [requests, stats] = await Promise.all([
    getExchangeRequests(exchange.id, { limit: 60 }),
    getExchangeRequestStats(exchange.id),
  ]);

  return (
    <Suspense fallback={null}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-5)' }}>
        <PageHeader
          accent="emerald"
          eyebrow="صرافی · عملیات"
          title="درخواست‌های مشتری"
          description={`رسیدگی به درخواست‌های حساب، رفع مسدودی و سقف — ${requests.length} درخواست اخیر`}
          breadcrumb={[{ label: 'پنل صرافی' }, { label: 'درخواست‌های مشتری' }]}
          icon="inbox"
        />
        <RequestsWorkspace
          exchangeId={exchange.id}
          initial={requests}
          stats={stats}
          staffRole={membership.staffRole}
        />
      </div>
    </Suspense>
  );
}
