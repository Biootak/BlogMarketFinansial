/**
 * /exchange/reports — گزارش تراکنش‌های صرافی
 *
 * Server Component: داده اولیه را می‌گیرد و به ReportsWorkspace پاس می‌دهد.
 * فیلترهای بیشتر (بازه تاریخ، نوع) در client انجام می‌شوند.
 */

import { getTransactions } from '@/actions/exchange-transactions';
import { getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ReportsWorkspace from './_components/ReportsWorkspace';

export const metadata: Metadata = { title: 'گزارشات صرافی' };

export default async function ExchangeReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const membership = await getExchangeForUser(session.user.id);
  if (!membership) redirect('/dashboard');

  const { exchange } = membership;

  const { rows, total } = await getTransactions(exchange.id, { limit: 100 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        title="گزارشات"
        description="مشاهده و دانلود گزارش تراکنش‌های صرافی"
        breadcrumb={[{ label: 'پنل صرافی' }, { label: 'گزارشات' }]}
      />

      <ReportsWorkspace exchangeId={exchange.id} initialRows={rows} initialTotal={total} />
    </div>
  );
}
