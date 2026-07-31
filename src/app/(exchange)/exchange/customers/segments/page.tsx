/**
 * /exchange/customers/segments — نمای عمیق سگمنت‌ها.
 *
 * Drill-down هر status با KPI اختصاصی، لیست مشتریان،
 * و توصیه‌های عملیاتی.
 */
import { getCustomers, getCustomerSegments, getCustomerRiskDistribution, getCustomerStats } from '@/actions/exchange-customers';
import { getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/Dashboard/primitives';
import { CustomerSegmentDeepDive } from '@/components/Exchange/customers/CustomerSegmentDeepDive';

export const metadata: Metadata = { title: 'سگمنت‌های مشتریان · صرافی' };

export default async function SegmentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/customers/segments');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/dashboard');

  const { exchange } = membership;

  const [stats, segments, riskBuckets, activeRes, prospectRes, frozenRes, closedRes] = await Promise.all([
    getCustomerStats(exchange.id),
    getCustomerSegments(exchange.id),
    getCustomerRiskDistribution(exchange.id),
    getCustomers(exchange.id, { status: 'ACTIVE', limit: 100 }),
    getCustomers(exchange.id, { status: 'PROSPECT', limit: 100 }),
    getCustomers(exchange.id, { status: 'FROZEN', limit: 100 }),
    getCustomers(exchange.id, { status: 'CLOSED', limit: 100 }),
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-5)' }}>
      <PageHeader
        title="سگمنت‌های مشتریان"
        description="سفر از سگمنت‌های کلان به رفتار تک‌تک مشتریان."
        breadcrumb={[
          { label: 'پنل صرافی' },
          { label: 'مشتریان', href: '/exchange/customers' },
          { label: 'سگمنت‌ها' },
        ]}
      />
      <CustomerSegmentDeepDive
        exchangeId={exchange.id}
        stats={stats}
        segments={segments}
        riskBuckets={riskBuckets}
        customersByStatus={{
          ACTIVE: activeRes.rows,
          PROSPECT: prospectRes.rows,
          FROZEN: frozenRes.rows,
          CLOSED: closedRes.rows,
        }}
        primaryCurrency={exchange.primaryCurrency ?? 'AFN'}
      />
    </div>
  );
}
