import { getCustomerStats, getCustomers } from '@/actions/exchange-customers';
import { getExchangeForUser } from '@/actions/exchanges';
/**
 * /exchange/customers/archive — نمای آرشیو مشتریان بسته/مسدود.
 */
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import { CustomerArchive } from '@/components/Exchange/customers/CustomerArchive';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'آرشیو مشتریان · صرافی' };

export default async function ArchivePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/customers/archive');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/dashboard');

  const [{ rows: archived }, { rows: frozen }, stats] = await Promise.all([
    getCustomers(membership.exchange.id, { status: 'CLOSED', limit: 200 }),
    getCustomers(membership.exchange.id, { status: 'FROZEN', limit: 200 }),
    getCustomerStats(membership.exchange.id),
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-5)' }}>
      <PageHeader
        title="آرشیو مشتریان"
        description="مشتریان بسته و مسدود برای گزارش‌های قانونی و مراجعات بعدی."
        breadcrumb={[
          { label: 'پنل صرافی' },
          { label: 'مشتریان', href: '/exchange/customers' },
          { label: 'آرشیو' },
        ]}
      />
      <CustomerArchive
        exchangeId={membership.exchange.id}
        archived={archived}
        frozen={frozen}
        totalCount={stats.total}
        canWrite={membership.staffRole !== 'VIEWER'}
        primaryCurrency={membership.exchange.primaryCurrency ?? 'AFN'}
      />
    </div>
  );
}
