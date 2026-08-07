/**
 * /exchange/transactions — ثبت و مشاهده تراکنش‌ها
 */

import { getCustomers } from '@/actions/exchange-customers';
import { getTransactions } from '@/actions/exchange-transactions';
import { getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import TransactionsWorkspace from './_components/TransactionsWorkspace';

const _faNum = new Intl.NumberFormat('fa-IR');

export const metadata: Metadata = { title: 'تراکنش‌های صرافی' };

export default async function TransactionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/transactions');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/dashboard');

  const { exchange } = membership;
  const [txResult, customersResult] = await Promise.all([
    getTransactions(exchange.id, { limit: 50 }),
    getCustomers(exchange.id, { limit: 200 }),
  ]);

  return (
    <Suspense fallback={null}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-5)' }}>
        <PageHeader
          title="تراکنش‌ها"
          description={`مجموع ${_faNum.format(txResult.total)} تراکنش`}
          breadcrumb={[{ label: 'پنل صرافی' }, { label: 'تراکنش‌ها' }]}
        />
        <TransactionsWorkspace
          exchangeId={exchange.id}
          initialRows={txResult.rows}
          total={txResult.total}
          customers={customersResult.rows}
          staffRole={membership.staffRole}
          primaryCurrency={exchange.primaryCurrency}
        />
      </div>
    </Suspense>
  );
}
