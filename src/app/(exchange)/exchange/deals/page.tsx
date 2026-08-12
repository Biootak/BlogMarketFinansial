/**
 * /exchange/deals — کارتابل معاملات ارزی صرافی
 *
 * داده‌ها:
 *   - getExchangeDeals (currency-deals.ts) → لیست معاملات با access check
 *   - getExchangeDealStats (exchange-ops.ts) → آمار وضعیت‌ها + حجم امروز
 *   - getExchangeQuotes (exchange-quotes.ts) → quote های ACTIVE برای ثبت حضوری
 *
 * اقدامات (server actions موجود):
 *   - confirmDeal / completeDeal / cancelDeal — از currency-deals.ts
 *   - createDeal با quoteId — برای ثبت معاملهٔ حضوری
 */

import { getExchangeDeals } from '@/actions/currency-deals';
import { getExchangeDealStats } from '@/actions/exchange-ops';
import { getExchangeQuotes } from '@/actions/exchange-quotes';
import { getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import DealsWorkspace from './_components/DealsWorkspace';

export const metadata: Metadata = {
  title: 'معاملات ارزی | پنل صرافی',
  description: 'تأیید، رسید و پیگیری معاملات ارزی صرافی',
};

export default async function DealsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/deals');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/forbidden');

  const { exchange } = membership;
  const [deals, stats, quotes] = await Promise.all([
    getExchangeDeals(exchange.id, { limit: 60 }),
    getExchangeDealStats(exchange.id),
    getExchangeQuotes(exchange.id),
  ]);

  const activeQuotes = quotes.filter(
    (q) => q.status === 'ACTIVE' && (!q.expiresAt || q.expiresAt.getTime() > Date.now()),
  );

  return (
    <Suspense fallback={null}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-5)' }}>
        <PageHeader
          accent="emerald"
          eyebrow="صرافی · معاملات"
          title="معاملات ارزی"
          description={`کارتابل تأیید و پیگیری معاملات — ${deals.length} معاملهٔ اخیر`}
          breadcrumb={[{ label: 'پنل صرافی' }, { label: 'معاملات ارزی' }]}
          icon="arrow-left-right"
        />
        <DealsWorkspace
          exchangeId={exchange.id}
          initialDeals={deals}
          stats={stats}
          activeQuotes={activeQuotes}
          staffRole={membership.staffRole}
          primaryCurrency={exchange.primaryCurrency}
        />
      </div>
    </Suspense>
  );
}
