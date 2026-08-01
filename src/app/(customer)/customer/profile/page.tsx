/**
 * /customer/profile — پروفایل مشتری
 */
import { getCustomerProfile } from '@/actions/customer-portal';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ProfileContent from './_components/ProfileContent';

export const metadata: Metadata = {
  title: 'پروفایل من',
  description: 'مشاهده و ویرایش اطلاعات شخصی',
};

export const dynamic = 'force-dynamic';

export default async function CustomerProfilePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // auth() حذف شد — layout.tsx احراز هویت را انجام داده است.
  const profile = await getCustomerProfile();
  if (!profile) redirect('/customer/dashboard');

  // M3/M4-fix (2026-08-01): settings به /customer/profile?field=email لینک
  // می‌دهد ولی صفحه field را نمی‌خواند — ویرایش مرده بود. حالا field به
  // ProfileContent پاس داده می‌شود تا فرم ویرایش باز شود.
  const sp = (await searchParams) ?? {};
  const fieldParam = typeof sp.field === 'string' ? sp.field : '';
  const openEdit = fieldParam === 'email' || fieldParam === 'city' || fieldParam === 'address'
    ? fieldParam
    : '';

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        title="پروفایل من"
        description="مشاهده و ویرایش اطلاعات شخصی"
        breadcrumb={[{ label: 'پورتال مشتری' }, { label: 'پروفایل' }]}
        icon="user-circle"
      />
      <ProfileContent profile={profile} initialEditField={openEdit} />
    </div>
  );
}
