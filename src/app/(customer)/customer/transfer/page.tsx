import { getCustomerAccountsDetail, getCustomerProfile } from '@/actions/customer-portal';
/**
 * /customer/transfer — عملیات مالی مشتری
 *
 * شامل: واریز، برداشت، انتقال داخلی، تبدیل ارز
 * دسترسی: CUSTOMER / TEST_CUSTOMER / MERCHANT
 */
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { TransferClient } from './_components/TransferClient';

export const metadata: Metadata = {
  title: 'عملیات مالی | پنل مشتری',
  description: 'واریز، برداشت، انتقال و تبدیل ارز',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CustomerTransferPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; account?: string; from?: string }>;
}) {
  // auth() حذف شد — layout.tsx احراز هویت را انجام داده است.
  const sp = await searchParams;
  const initialAction = sp?.action ?? 'deposit';
  // pre-selected accountId (برای deposit/withdraw از ?account=، برای transfer/exchange از ?from=)
  const presetAccountId = sp?.account ?? sp?.from ?? undefined;

  const [profile, accounts] = await Promise.all([
    getCustomerProfile(),
    getCustomerAccountsDetail(),
  ]);

  if (!profile) redirect('/customer/dashboard');

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        eyebrow="عملیات مالی"
        title="انتقال و عملیات"
        description="واریز، برداشت، انتقال داخلی و تبدیل ارز"
        breadcrumb={[{ href: '/customer/dashboard', label: 'پنل مشتری' }, { label: 'عملیات مالی' }]}
        icon="arrow-left-right"
        accent="violet"
      />
      <TransferClient
        profile={profile}
        accounts={accounts}
        initialAction={initialAction}
        presetAccountId={presetAccountId}
      />
    </div>
  );
}
