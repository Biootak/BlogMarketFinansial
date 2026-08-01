/**
 * /customer/accounts/[id] — جزئیات یک حساب + دفتر‌کل
 */
import { getAccountLedger, getCustomerAccountById } from '@/actions/customer-portal';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AccountDetail from './_components/AccountDetail';

export const metadata: Metadata = { title: 'جزئیات حساب' };
export const dynamic = 'force-dynamic';

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // auth() حذف شد — layout.tsx احراز هویت را انجام داده است.
  const { id } = await params;
  const [account, ledger] = await Promise.all([
    getCustomerAccountById(id),
    getAccountLedger(id, 20),
  ]);

  if (!account) notFound();

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        title={`حساب ${account.currency}`}
        description={account.label ?? (account.type as string)}
        breadcrumb={[
          { label: 'پورتال مشتری' },
          { label: 'حساب‌ها', href: '/customer/accounts' },
          { label: account.currency },
        ]}
        icon="credit-card"
      />
      <AccountDetail account={account} ledger={ledger} />
    </div>
  );
}
