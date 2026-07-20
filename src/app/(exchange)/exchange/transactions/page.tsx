import { getCustomers } from '@/actions/exchange-customers';
import { getTransactions } from '@/actions/exchange-transactions';
import { getExchangeForUser } from '@/actions/exchanges';
/**
 * /exchange/transactions — ثبت و مشاهده تراکنش‌ها
 */
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import TransactionsWorkspace from './_components/TransactionsWorkspace';

export const metadata: Metadata = { title: 'تراکنش‌های صرافی' };

export default async function TransactionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const membership = await getExchangeForUser(session.user.id);
  if (!membership) redirect('/dashboard');

  const { exchange } = membership;
  const [txResult, customersResult] = await Promise.all([
    getTransactions(exchange.id, { limit: 50 }),
    getCustomers(exchange.id, { limit: 200 }),
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-5)' }}>
      <PageHeader
        title="تراکنش‌ها"
        description={`مجموع ${new Intl.NumberFormat('fa-IR').format(txResult.total)} تراکنش`}
        breadcrumb={[{ label: 'پنل صرافی' }, { label: 'تراکنش‌ها' }]}
      />
      <TransactionsWorkspace
        exchangeId={exchange.id}
        initialRows={txResult.rows}
        customers={customersResult.rows}
        staffRole={membership.staffRole}
      />
    </div>
  );
}
