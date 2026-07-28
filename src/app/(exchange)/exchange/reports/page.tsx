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
  if (!session?.user?.id) redirect('/signin');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/dashboard');

  const { exchange } = membership;

  const [txnResult, reportResult] = await Promise.all([
    getTransactions(exchange.id, { limit: 100 }),
    getExchangeReport(exchange.id),
  ]);

  // ReportLite — فقط فیلدهایی که ReportsCockpit مصرف می‌کند
  const report = reportResult.success
    ? {
        totalVolume: reportResult.data.totalVolume,
        totalFee: reportResult.data.totalFee,
        totalDeals: reportResult.data.totalDeals,
        pnlByCurrency: reportResult.data.pnlByCurrency,
        topCustomers: reportResult.data.topCustomers.map((c) => ({
          id: c.customerId,
          name: c.fullName,
          dealCount: c.dealCount,
          totalVolume: c.totalVolume,
          currency: reportResult.data!.pnlByCurrency[0]?.currency ?? 'AFN',
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
        txRows={txnResult.rows}
        txTotal={txnResult.total}
      />
    </div>
  );
}
