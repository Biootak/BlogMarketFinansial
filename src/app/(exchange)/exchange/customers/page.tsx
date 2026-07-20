/**
 * /exchange/customers — لیست و مدیریت مشتریان
 */
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getExchangeForUser } from '@/actions/exchanges';
import { getCustomers } from '@/actions/exchange-customers';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import CustomersWorkspace from './_components/CustomersWorkspace';

export const metadata: Metadata = { title: 'مشتریان صرافی' };

export default async function CustomersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const membership = await getExchangeForUser(session.user.id);
  if (!membership) redirect('/dashboard');

  const { exchange } = membership;
  const { rows, total } = await getCustomers(exchange.id, { limit: 50 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-5)' }}>
      <PageHeader
        title="مشتریان"
        description={`${new Intl.NumberFormat('fa-IR').format(total)} مشتری ثبت‌شده`}
        breadcrumb={[{ label: 'پنل صرافی' }, { label: 'مشتریان' }]}
      />
      <CustomersWorkspace
        exchangeId={exchange.id}
        initialRows={rows}
        totalCount={total}
        staffRole={membership.staffRole}
      />
    </div>
  );
}
