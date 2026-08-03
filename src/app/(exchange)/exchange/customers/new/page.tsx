import { getExchangeForUser } from '@/actions/exchanges';
/**
 * /exchange/customers/new — فرم اختصاصی ایجاد مشتری.
 *
 * نسخه‌ی full-page از CustomerEditDrawer با چیدمان
 * سه‌ستونی و زمینه‌ی کم‌صداتر. در Cockpit اصلی
 * لینک "مشتری جدید" به این صفحه navigate می‌کند.
 */
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import { CustomerCreateWorkspace } from '@/components/Exchange/customers/CustomerCreateWorkspace';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'ایجاد مشتری · صرافی' };

export default async function NewCustomerPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/customers/new');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/dashboard');

  if (membership.staffRole === 'VIEWER') {
    redirect('/exchange/customers');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-5)' }}>
      <PageHeader
        title="ایجاد مشتری جدید"
        description="مشخصات، محدودیت‌ها و وضعیت را در یک صفحه وارد کنید."
        breadcrumb={[
          { label: 'پنل صرافی' },
          { label: 'مشتریان', href: '/exchange/customers' },
          { label: 'ایجاد' },
        ]}
      />
      <CustomerCreateWorkspace
        exchangeId={membership.exchange.id}
        primaryCurrency={membership.exchange.primaryCurrency ?? 'AFN'}
      />
    </div>
  );
}
