/**
 * /customer/profile — پروفایل مشتری
 */
import { getCustomerProfile } from '@/actions/customer-portal';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ProfileContent from './_components/ProfileContent';

export const metadata: Metadata = {
  title: 'پروفایل من',
  description: 'مشاهده و ویرایش اطلاعات شخصی',
};

export const dynamic = 'force-dynamic';

export default async function CustomerProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/customer/profile');

  const profile = await getCustomerProfile();
  if (!profile) redirect('/');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        title="پروفایل من"
        description="مشاهده و ویرایش اطلاعات شخصی"
        breadcrumb={[{ label: 'پورتال مشتری' }, { label: 'پروفایل' }]}
        icon="user-circle"
      />
      <ProfileContent profile={profile} />
    </div>
  );
}
