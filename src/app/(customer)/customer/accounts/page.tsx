/**
 * /customer/accounts — حساب‌های مالی مشتری
 */
import { getCustomerAccountsDetail, getCustomerProfile } from '@/actions/customer-portal';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AccountsContent from './_components/AccountsContent';

export const metadata: Metadata = {
  title: 'حساب‌های من',
  description: 'مشاهده موجودی و وضعیت حساب‌های مالی',
};

export const dynamic = 'force-dynamic';

export default async function CustomerAccountsPage() {
  // auth() حذف شد — layout.tsx احراز هویت را انجام داده است.
  const [profile, accounts] = await Promise.all([
    getCustomerProfile(),
    getCustomerAccountsDetail(),
  ]);

  if (!profile) redirect('/customer/dashboard');

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        title="حساب‌های من"
        description={`${new Intl.NumberFormat('fa-IR').format(accounts.length)} حساب فعال`}
        breadcrumb={[{ label: 'پورتال مشتری' }, { label: 'حساب‌ها' }]}
        icon="credit-card"
      />
      <AccountsContent accounts={accounts} profile={profile} />
    </div>
  );
}
