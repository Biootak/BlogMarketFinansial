/**
 * /exchange/reports — گزارش‌های صرافی (P2026 redesign).
 *
 * Server Component: داده‌ها اینجا fetch می‌شوند و به ReportsCockpit پاس می‌شوند.
 * ReportsCockpit تمام visualization + filter را client-side انجام می‌دهد.
 */

import { getTransactions } from '@/actions/exchange-transactions';
import { getExchangeForUser } from '@/actions/exchanges';
import { getExchangeReport } from '@/actions/reporting';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ReportsCockpit from './_components/ReportsCockpit';

export const metadata: Metadata = { title: 'گزارش‌ها | پنل صرافی' };

export default async function ExchangeReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/reports');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/forbidden');

  const { exchange } = membership;

  const [txnResult, reportResult] = await Promise.all([
    // P1-1: limit بالاتر — داده‌های کافی برای فیلتر client-side در ۳۰ روز اخیر
    getTransactions(exchange.id, { limit: 500 }),
    getExchangeReport(exchange.id),
  ]);

  // P1-2: primaryCurrency صرافی را برای نمایش KPI پاس می‌دهیم
  const primaryCurrency = reportResult.success
    ? reportResult.data.dominantCurrency
    : (exchange.primaryCurrency ?? 'AFN');

  // ReportLite — فقط فیلدهایی که ReportsCockpit مصرف می‌کند
  const report = reportResult.success
    ? {
        totalVolume: reportResult.data.totalVolume,
        totalFee: reportResult.data.totalFee,
        totalDeals: reportResult.data.totalDeals,
        pnlByCurrency: reportResult.data.pnlByCurrency,
        // P2-2 fix: هر مشتری ارز واقعی خود را دارد (از reporting.ts می‌آید)
        topCustomers: reportResult.data.topCustomers.map((c) => ({
          id: c.customerId,
          name: c.fullName,
          dealCount: c.dealCount,
          totalVolume: c.totalVolume,
          currency: c.currency,
        })),
        dailySummary: reportResult.data.dailySummary,
      }
    : {
        totalVolume: 0,
        totalFee: 0,
        totalDeals: 0,
        pnlByCurrency: [],
        topCustomers: [],
        dailySummary: [],
      };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        title="گزارش‌ها"
        description="تحلیل مالی، شبکهٔ ارزی، ریتم هفتگی و لیست تراکنش‌ها."
        breadcrumb={[{ label: 'پنل صرافی' }, { label: 'گزارش‌ها' }]}
        accent="violet"
        icon="bar-chart"
      />
      <ReportsCockpit
        exchangeId={exchange.id}
        report={report}
        primaryCurrency={primaryCurrency}
        txRows={txnResult.rows}
        txTotal={txnResult.total}
      />
    </div>
  );
}
