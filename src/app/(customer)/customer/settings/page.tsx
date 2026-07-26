/**
 * /customer/settings — تنظیمات حساب مشتری
 */
import { getCustomerProfile } from '@/actions/customer-portal';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import SettingsContent from './_components/SettingsContent';

export const metadata: Metadata = {
  title: 'تنظیمات',
  description: 'مدیریت تنظیمات و امنیت حساب',
};

export const dynamic = 'force-dynamic';

export default async function CustomerSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/customer/settings');

  const profile = await getCustomerProfile();
  if (!profile) redirect('/');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        title="تنظیمات"
        description="مدیریت امنیت و اطلاعات حساب"
        breadcrumb={[{ label: 'پورتال مشتری' }, { label: 'تنظیمات' }]}
        icon="settings"
      />
      <SettingsContent profile={profile} />
    </div>
  );
}
