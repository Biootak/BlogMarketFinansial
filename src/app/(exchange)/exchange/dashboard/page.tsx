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
import ExchangeRecentTransactions from './_components/ExchangeRecentTransactions';

export const metadata: Metadata = { title: 'داشبورد صرافی' };

export default async function ExchangeDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const membership = await getExchangeForUser(session.user.id);
  if (!membership) redirect('/dashboard');

  const { exchange } = membership;
  const stats = await getExchangeStats(exchange.id);

  const volumeAfn = stats.totalVolumeAfn / 100;

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

      <ExchangeRecentTransactions exchangeId={exchange.id} />
    </div>
  );
}
