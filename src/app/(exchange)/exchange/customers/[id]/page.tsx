/**
 * /exchange/customers/[id] — پروفایل کامل یک مشتری
 */
import { getCustomerById } from '@/actions/exchange-customers';
import { getTransactions } from '@/actions/exchange-transactions';
import { getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import CustomerDetailView from './_components/CustomerDetailView';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `پروفایل مشتری — ${id.slice(0, 8)}` };
}

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/customers');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/dashboard');

  const { exchange } = membership;

  const [customer, txResult] = await Promise.all([
    getCustomerById(exchange.id, id),
    getTransactions(exchange.id, { customerId: id, limit: 20 }),
  ]);

  if (!customer) notFound();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-5)' }}>
      <PageHeader
        title={customer.fullName}
        description={customer.phone}
        breadcrumb={[
          { label: 'پنل صرافی' },
          { label: 'مشتریان', href: '/exchange/customers' },
          { label: customer.fullName },
        ]}
      />
      <CustomerDetailView
        customer={customer}
        transactions={txResult.rows}
        exchangeId={exchange.id}
        staffRole={membership.staffRole}
      />
    </div>
  );
}
