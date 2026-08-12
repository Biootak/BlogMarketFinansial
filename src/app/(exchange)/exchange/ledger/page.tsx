/**
 * /exchange/ledger — دفتر کل صرافی
 *
 * داده: getExchangeLedger (exchange-ops.ts) → LedgerEntry های همین صرافی
 * با ماندهٔ جاری (runningBalance)، جهت، حساب/مشتری و مجموع واریز/برداشت.
 */

import { getExchangeLedger } from '@/actions/exchange-ops';
import { getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import LedgerWorkspace from './_components/LedgerWorkspace';

export const metadata: Metadata = {
  title: 'دفتر کل | پنل صرافی',
  description: 'موجودی صندوق و گردش حساب‌های صرافی',
};

export default async function LedgerPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/ledger');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/forbidden');

  const result = await getExchangeLedger(membership.exchange.id, { limit: 60 });

  return (
    <Suspense fallback={null}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-5)' }}>
        <PageHeader
          accent="emerald"
          eyebrow="صرافی · مالی"
          title="دفتر کل"
          description={`گردش حساب‌ها و ماندهٔ جاری — ${result.success ? result.data.total : 0} ورودی`}
          breadcrumb={[{ label: 'پنل صرافی' }, { label: 'دفتر کل' }]}
          icon="layers"
        />
        <LedgerWorkspace
          exchangeId={membership.exchange.id}
          initial={result.success ? result.data : null}
          primaryCurrency={membership.exchange.primaryCurrency}
        />
      </div>
    </Suspense>
  );
}
