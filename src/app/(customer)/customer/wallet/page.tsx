/**
 * /customer/wallet — کیف پول مشتری
 *
 * نمایش موجودی، لیست حساب‌ها و تاریخچهٔ تراکنش‌ها
 * دسترسی: CUSTOMER / TEST_CUSTOMER / MERCHANT
 */
import { auth } from '@/auth';
import {
  getCustomerAccountsDetail,
  getCustomerProfile,
  getCustomerRecentTransactions,
} from '@/actions/customer-portal';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CustomerWalletContent } from './_components/WalletContent';

export const metadata: Metadata = {
  title: 'کیف پول من | پنل مشتری',
  description: 'موجودی و تاریخچهٔ تراکنش‌های کیف پول',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CustomerWalletPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/customer/wallet');

  const [profile, accounts, recentTxns] = await Promise.all([
    getCustomerProfile(),
    getCustomerAccountsDetail(),
    getCustomerRecentTransactions(20),
  ]);

  if (!profile) redirect('/');

  return (
    <div
      dir="rtl"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}
    >
      <PageHeader
        eyebrow="کیف پول"
        title="کیف پول من"
        description="موجودی، حساب‌ها و تاریخچهٔ تراکنش‌ها"
        breadcrumb={[
          { href: '/customer/dashboard', label: 'پنل مشتری' },
          { label: 'کیف پول' },
        ]}
        icon="wallet"
        accent="indigo"
      />
      <CustomerWalletContent
        profile={profile}
        accounts={accounts}
        recentTransactions={recentTxns}
      />
    </div>
  );
}
