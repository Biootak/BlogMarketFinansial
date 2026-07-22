/**
 * /exchange/reports — گزارش مالی P&L صرافی (upgrade)
 *
 * دو تب: تراکنش‌ها (موجود) + P&L جدید
 */

import { getExchangeQuotes } from '@/actions/exchange-quotes';
import { getTransactions } from '@/actions/exchange-transactions';
import { getExchangeForUser } from '@/actions/exchanges';
import { getExchangeReport } from '@/actions/reporting';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ReportsWorkspace from './_components/ReportsWorkspace';

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        title="گزارش‌ها"
        description="تحلیل مالی، حجم معاملات، سود/زیان و خروجی CSV"
        breadcrumb={[{ label: 'پنل صرافی' }, { label: 'گزارش‌ها' }]}
      />
      <ReportsWorkspace
        exchangeId={exchange.id}
        initialRows={txnResult.rows}
        initialTotal={txnResult.total}
        initialReport={reportResult.success ? reportResult.data : null}
      />
    </div>
  );
}
