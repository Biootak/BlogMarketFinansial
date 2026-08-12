/**
 * /exchange/fraud — صف بررسی تقلب صرافی
 *
 * داده: getExchangeFraudQueue + getExchangeFraudStats (exchange-ops.ts)
 * اقدام: resolveExchangeFraud — بستن/تأیید کلاهبرداری/بازگشایی با AuditLog
 */

import { getExchangeFraudQueue, getExchangeFraudStats } from '@/actions/exchange-ops';
import { getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import FraudWorkspace from './_components/FraudWorkspace';

export const metadata: Metadata = {
  title: 'بررسی تقلب | پنل صرافی',
  description: 'صف تراکنش‌های پرریسک صرافی',
};

export default async function FraudPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/fraud');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/forbidden');

  const { exchange } = membership;
  const [queue, stats] = await Promise.all([
    getExchangeFraudQueue(exchange.id),
    getExchangeFraudStats(exchange.id),
  ]);

  return (
    <Suspense fallback={null}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-5)' }}>
        <PageHeader
          accent="emerald"
          eyebrow="صرافی · امنیت"
          title="بررسی تقلب"
          description={`صف تراکنش‌های پرریسک — ${queue.length} پرونده`}
          breadcrumb={[{ label: 'پنل صرافی' }, { label: 'بررسی تقلب' }]}
          icon="shield-x"
        />
        <FraudWorkspace
          exchangeId={exchange.id}
          initial={queue}
          stats={stats}
          staffRole={membership.staffRole}
        />
      </div>
    </Suspense>
  );
}
