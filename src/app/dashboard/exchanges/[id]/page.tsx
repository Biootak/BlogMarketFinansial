/**
 * /dashboard/exchanges/[id] — جزئیات کامل یک صرافی برای OWNER/ADMIN پلتفرم
 *
 * نمایش: اطلاعات پایه، آمار، لیست کارمندان، آخرین تراکنش‌ها.
 * قابلیت ویرایش وضعیت (تأیید/تعلیق) مستقیم از این صفحه.
 */

import { getCustomers } from '@/actions/exchange-customers';
import { getTransactions } from '@/actions/exchange-transactions';
import { getExchangeById, getExchangeStaff } from '@/actions/exchanges';
import { auth } from '@/auth';
import { PageHeader, StatCard, StatGrid } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import ExchangeDetailClient from './_components/ExchangeDetailClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const exchange = await getExchangeById(id);
  return { title: exchange ? `${exchange.name} | مدیریت صراف‌ها` : 'صرافی یافت نشد' };
}

export default async function ExchangeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  // SUPERADMIN = OWNER alias (G8-fix) — middleware ADMIN_ROLES already
  // lets SUPERADMIN through; keep the page check in sync.
  if (!session?.user || !['OWNER', 'SUPERADMIN', 'ADMIN'].includes(session.user.role as string)) {
    redirect('/dashboard');
  }

  const { id } = await params;
  const exchange = await getExchangeById(id);
  if (!exchange) notFound();

  const [staff, txResult, customersResult] = await Promise.all([
    getExchangeStaff(id),
    getTransactions(id, { limit: 10 }),
    getCustomers(id, { limit: 5 }),
  ]);

  return (
    <main
      style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: 'var(--ds-space-6) var(--ds-space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-6)',
      }}
    >
      <PageHeader
        variant="minimal"
        breadcrumb={[
          { label: 'داشبورد', href: '/dashboard' },
          { label: 'صراف‌ها', href: '/dashboard/exchanges' },
          { label: exchange.name },
        ]}
        title={exchange.name}
        description={`${exchange.city ?? 'صرافی'} · /${exchange.slug}`}
      />

      {/* آمار کلی */}
      <StatGrid cols={4}>
        <StatCard
          label="مشتریان"
          value={customersResult.total}
          format="persian"
          href="/exchange/customers"
        />
        <StatCard label="تراکنش‌ها" value={txResult.total} format="persian" />
        <StatCard label="کارمندان" value={staff.length} format="persian" />
        <StatCard label="کارمزد پلتفرم" value={exchange.platformFee} format="percent" />
      </StatGrid>

      {/* بخش تعاملی (ویرایش وضعیت، نمایش اطلاعات) */}
      <ExchangeDetailClient
        exchange={exchange}
        staff={staff}
        recentTransactions={txResult.rows}
        recentCustomers={customersResult.rows}
      />
    </main>
  );
}
