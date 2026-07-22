/**
 * /exchange/dashboard — داشبورد خلاصه صراف
 */
import { getExchangeStats } from '@/actions/exchange-transactions';
import { getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import { PageHeader, StatCard, StatGrid } from '@/components/Dashboard/primitives';
import { Building2, CircleDollarSign, TrendingUp, Users } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import ExchangeRecentTransactions from './_components/ExchangeRecentTransactions';

export const metadata: Metadata = { title: 'داشبورد صرافی' };

export default async function ExchangeDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/dashboard');

  const { exchange } = membership;
  const stats = await getExchangeStats(exchange.id);

  const volumeAfn = Number(stats.totalVolume) / 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        title={`داشبورد — ${exchange.name}`}
        description={`${exchange.city ?? 'صرافی'} · پنل مدیریت`}
        breadcrumb={[{ label: 'پنل صرافی' }, { label: 'داشبورد' }]}
      />

      <StatGrid cols={4}>
        <StatCard
          label="کل مشتریان"
          value={stats.totalCustomers}
          icon={Users}
          href="/exchange/customers"
        />
        <StatCard
          label="تراکنش‌های امروز"
          value={stats.todayCount}
          icon={TrendingUp}
          href="/exchange/transactions"
        />
        <StatCard
          label="کل تراکنش‌ها"
          value={stats.totalTransactions}
          icon={CircleDollarSign}
          href="/exchange/transactions"
        />
        <StatCard label="حجم (افغانی)" value={volumeAfn} icon={Building2} format="compact" />
      </StatGrid>

      <Suspense
        fallback={
          <div
            style={{
              background: 'var(--at-surface)',
              border: '1px solid var(--at-line)',
              borderRadius: '14px',
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--at-fg-subtle)',
              fontSize: 'var(--ds-text-sm)',
            }}
          >
            در حال بارگذاری تراکنش‌ها…
          </div>
        }
      >
        <ExchangeRecentTransactions exchangeId={exchange.id} />
      </Suspense>
    </div>
  );
}
