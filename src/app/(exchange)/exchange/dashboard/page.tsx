/**
 * /exchange/dashboard — داشبورد خلاصه صراف
 */
import { getExchangeStats } from '@/actions/exchange-transactions';
import { getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import { PageHeader, StatCard, StatGrid } from '@/components/Dashboard/primitives';
import { Building2, CircleDollarSign, Clock, TrendingUp, Users } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import ExchangeRecentTransactions from './_components/ExchangeRecentTransactions';
import ExchangeDashboardEnhancements from './_components/ExchangeDashboardEnhancements';

export const metadata: Metadata = { title: 'داشبورد صرافی' };

/** delta درصدی امروز vs دیروز — null اگر دیروز صفر بود */
function calcDelta(
  today: number,
  yesterday: number,
): { value: number; trend: 'up' | 'down' } | undefined {
  if (yesterday === 0) return undefined;
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  return { value: Math.abs(pct), trend: today >= yesterday ? 'up' : 'down' };
}

export default async function ExchangeDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/dashboard');

  const { exchange } = membership;
  const stats = await getExchangeStats(exchange.id);

  const volumeAfn = Number(stats.totalVolume) / 100;
  const todayDelta = calcDelta(stats.todayCount, stats.yesterdayCount);

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
          icon={<Users className="size-4" />}
          href="/exchange/customers"
          delta={
            stats.todayNewCustomers > 0
              ? { value: stats.todayNewCustomers, trend: 'up' }
              : undefined
          }
          info={
            stats.todayNewCustomers > 0 ? `${stats.todayNewCustomers} مشتری جدید امروز` : undefined
          }
        />
        <StatCard
          label="تراکنش‌های امروز"
          value={stats.todayCount}
          icon={<TrendingUp className="size-4" />}
          href="/exchange/transactions"
          delta={todayDelta}
          info={`دیروز: ${new Intl.NumberFormat('fa-IR').format(stats.yesterdayCount)}`}
        />
        <StatCard
          label="در انتظار تأیید"
          value={stats.pendingCount}
          icon={<Clock className="size-4" />}
          href="/exchange/transactions"
          info="تراکنش‌های در انتظار پردازش"
        />
        <StatCard
          label={`حجم کل (${stats.statsCurrency})`}
          value={volumeAfn}
          icon={<Building2 className="size-4" />}
          format="compact"
          info="مجموع تراکنش‌های تکمیل‌شده"
        />
      </StatGrid>

      <ExchangeDashboardEnhancements stats={stats} />

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
