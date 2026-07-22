/**
 * /exchange/settings — تنظیمات صرافی
 *
 * فقط OWNER و MANAGER می‌توانند ویرایش کنند.
 * بقیه نقش‌ها فقط مشاهده دارند.
 */

import { getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import SettingsWorkspace from './_components/SettingsWorkspace';

export const metadata: Metadata = { title: 'تنظیمات صرافی' };

export default async function ExchangeSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/dashboard');

  const { exchange, staffRole } = membership;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        title="تنظیمات"
        description="مدیریت اطلاعات و پیکربندی صرافی"
        breadcrumb={[{ label: 'پنل صرافی' }, { label: 'تنظیمات' }]}
      />

      <SettingsWorkspace exchange={exchange} staffRole={staffRole} />
    </div>
  );
}
