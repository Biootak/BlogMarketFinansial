/**
 * /customer/transactions/[id] — جزئیات یک تراکنش
 */
import { getCustomerTransactionById } from '@/actions/customer-portal';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import TransactionDetail from './_components/TransactionDetail';

export const metadata: Metadata = { title: 'جزئیات تراکنش' };
export const dynamic = 'force-dynamic';

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth');

  const { id } = await params;
  const txn = await getCustomerTransactionById(id);
  if (!txn) notFound();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        title="جزئیات تراکنش"
        description={`شناسه: ${id.slice(0, 8)}...`}
        breadcrumb={[
          { label: 'پورتال مشتری' },
          { label: 'تراکنش‌ها', href: '/customer/transactions' },
          { label: 'جزئیات' },
        ]}
        icon="arrow-left-right"
      />
      <TransactionDetail txn={txn} />
    </div>
  );
}
