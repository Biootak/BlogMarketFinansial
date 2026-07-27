/**
 * /exchange/settlement — تسویه‌حساب صرافی
 *
 * Server Component: داده‌ها اینجا fetch می‌شوند و به SettlementWorkspace پاس می‌شوند.
 * SettlementWorkspace فقط filter client-side انجام می‌دهد — بدون re-fetch.
 */

import { getExchangeForUser } from '@/actions/exchanges';
import { getMyExchangeSettlements } from '@/actions/settlement';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import SettlementWorkspace from './_components/SettlementWorkspace';

export const metadata: Metadata = { title: 'تسویه‌حساب | پنل صرافی' };

export default async function SettlementPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/dashboard');

  // فقط OWNER و MANAGER صرافی به این صفحه دسترسی دارند
  if (!['OWNER', 'MANAGER'].includes(membership.staffRole)) redirect('/exchange/dashboard');

  // limit=500: settlement ماهانه است — 500 دوره ≈ ۴۰ سال، در عمل هرگز truncate نمی‌شود
  const initialRows = await getMyExchangeSettlements(membership.exchange.id, { limit: 500 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        title="تسویه‌حساب"
        description="دوره‌های تسویه، حجم معاملات و کارمزد پلتفرم."
        breadcrumb={[{ label: 'پنل صرافی' }, { label: 'تسویه‌حساب' }]}
      />
      <SettlementWorkspace initialRows={initialRows} staffRole={membership.staffRole} />
    </div>
  );
}
