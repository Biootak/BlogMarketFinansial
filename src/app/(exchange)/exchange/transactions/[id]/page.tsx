import { getCustomers } from '@/actions/exchange-customers';
import { getExchangeTransactionById } from '@/actions/exchange-transactions';
import { getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { TransactionDetailView } from './_components/TransactionDetailView';
import s from './page.module.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'جزئیات تراکنش | صرافی',
  description: 'نمایش جزئیات تراکنش، زنجیره تغییرات و اقدامات مرتبط',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ExchangeTransactionDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/transactions');

  const { id } = await params;
  const tx = await getExchangeTransactionById(id);
  if (!tx) notFound();

  const [membership, customers] = await Promise.all([
    getExchangeForUser(),
    getCustomers(tx.exchangeId, { limit: 200 }),
  ]);
  if (!membership) redirect('/dashboard');

  const canEdit = ['OWNER', 'MANAGER'].includes(membership.staffRole);
  const canAdd = ['OWNER', 'MANAGER', 'STAFF'].includes(membership.staffRole);

  return (
    <div className={s.page} dir="rtl">
      <PageHeader
        title={`جزئیات تراکنش ${tx.id.slice(0, 8)}`}
        description="جزئیات، اقدامات و زنجیره تغییرات"
        breadcrumb={[
          { label: 'پنل صرافی' },
          { label: 'تراکنش‌ها', href: '/exchange/transactions' },
          { label: 'جزئیات' },
        ]}
      />
      <TransactionDetailView
        transaction={tx}
        exchangeName={membership.exchange.name}
        canEdit={canEdit}
        canAdd={canAdd}
        customers={customers.rows}
      />
    </div>
  );
}
