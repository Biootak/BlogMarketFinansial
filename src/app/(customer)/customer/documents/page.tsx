/**
 * /customer/documents — مدارک و اسناد مشتری
 *
 * نمایش فایل‌های KYC ارسال‌شده + راهنمای آپلود
 */
import { getCustomerKycRecords, getCustomerProfile } from '@/actions/customer-portal';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import DocumentsContent from './_components/DocumentsContent';

export const metadata: Metadata = {
  title: 'مدارک',
  description: 'مدارک هویتی ارسال‌شده',
};

export const dynamic = 'force-dynamic';

export default async function CustomerDocumentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/customer/documents');

  const [profile, kycRecords] = await Promise.all([getCustomerProfile(), getCustomerKycRecords()]);

  if (!profile) redirect('/');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        title="مدارک"
        description="اسناد هویتی ارسال‌شده برای احراز هویت"
        breadcrumb={[{ label: 'پورتال مشتری' }, { label: 'مدارک' }]}
        icon="file-text"
      />
      <DocumentsContent profile={profile} kycRecords={kycRecords} />
    </div>
  );
}
