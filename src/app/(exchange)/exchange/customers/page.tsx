import {
  getCustomerActivityPulse,
  getCustomerRiskDistribution,
  getCustomerSegments,
  getCustomerStats,
  getCustomers,
  getTopCustomers,
} from '@/actions/exchange-customers';
import { getExchangeForUser } from '@/actions/exchanges';
/**
 * /exchange/customers — لیست و مدیریت مشتریان (P2026 redesign)
 */
import { auth } from '@/auth';
import { CustomerCockpit } from '@/components/Exchange/customers/CustomerCockpit';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'مشتریان صرافی' };

export default async function CustomersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/customers');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/forbidden');

  const { exchange, staffRole } = membership;
  const exchangeId = exchange.id;
  const canWrite = staffRole !== 'VIEWER';

  // Parallel data fetching — یک roundtrip موازی
  const [{ rows: customers }, stats, segments, riskBuckets, pulse, topCustomers] =
    await Promise.all([
      getCustomers(exchangeId, { limit: 200 }),
      getCustomerStats(exchangeId),
      getCustomerSegments(exchangeId),
      getCustomerRiskDistribution(exchangeId),
      getCustomerActivityPulse(exchangeId),
      getTopCustomers(exchangeId, 5),
    ]);

  return (
    <CustomerCockpit
      exchangeId={exchangeId}
      currency={exchange.primaryCurrency ?? 'AFN'}
      customers={customers}
      stats={stats}
      segments={segments}
      riskBuckets={riskBuckets}
      pulse={pulse}
      topCustomers={topCustomers}
      canWrite={canWrite}
    />
  );
}
