/**
 * /customer/accounts — حساب‌های مالی مشتری
 */
import {
  getCustomerAccountsDetail,
  getCustomerBalanceTrend,
  getCustomerProfile,
} from '@/actions/customer-portal';
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
  const [profile, accounts, balanceTrend] = await Promise.all([
    getCustomerProfile(),
    getCustomerAccountsDetail(),
    // FIX (2026-08-01): روند واقعی از تراکنش‌ها — جایگزین sparkline مصنوعی
    getCustomerBalanceTrend(30),
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
      <AccountsContent accounts={accounts} profile={profile} balanceTrend={balanceTrend} />
    </div>
  );
}
