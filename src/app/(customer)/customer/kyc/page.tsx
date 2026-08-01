/**
 * /customer/kyc — احراز هویت مشتری
 *
 * نمایش وضعیت KYC فعلی + فرم ارسال مدرک جدید
 */
import { getCustomerKycRecords, getCustomerProfile } from '@/actions/customer-portal';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import KycContent from './_components/KycContent';

export const metadata: Metadata = {
  title: 'احراز هویت',
  description: 'ارسال و پیگیری مدارک احراز هویت',
};

export const dynamic = 'force-dynamic';

export default async function CustomerKycPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/customer/kyc');

  const [profile, kycRecords] = await Promise.all([getCustomerProfile(), getCustomerKycRecords()]);

  if (!profile) redirect('/customer/dashboard');

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        title="احراز هویت"
        description="مدیریت مدارک هویتی و سطح تأیید حساب"
        breadcrumb={[{ label: 'پورتال مشتری' }, { label: 'احراز هویت' }]}
        icon="shield-check"
      />
      <KycContent profile={profile} records={kycRecords} />
    </div>
  );
}
