/**
 * /customer/devices — مدیریت دستگاه‌های متصل به حساب
 *
 * دسترسی: CUSTOMER / TEST_CUSTOMER / MERCHANT + platform admins
 * داده: از deviceActions.getMyDevices (userId محور)
 */

import { getMyDevices } from '@/actions/deviceActions';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives/PageHeader';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DevicesCenter } from './_components/DevicesCenter';

export const metadata: Metadata = {
  title: 'دستگاه‌های من | پنل مشتری',
  description: 'مدیریت دستگاه‌های متصل و لغو دسترسی',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CustomerDevicesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/customer/devices');
  }

  const result = await getMyDevices();
  const initial = result.success ? result.data : [];

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        eyebrow="امنیت"
        title="دستگاه‌های من"
        description="دستگاه‌های متصل به حساب شما. دستگاه‌های ناشناس را سریع لغو کنید."
        breadcrumb={[
          { href: '/customer/dashboard', label: 'پنل مشتری' },
          { label: 'امنیت' },
          { label: 'دستگاه‌ها' },
        ]}
        icon="device-phone-mobile"
        accent="indigo"
      />
      <DevicesCenter initial={initial} />
    </div>
  );
}
