/**
 * /customer/devices — مدیریت دستگاه‌های متصل به حساب
 *
 * دسترسی: CUSTOMER / TEST_CUSTOMER / MERCHANT + platform admins
 * داده: از deviceActions.getMyDevices (userId محور)
 */

import { getMyDevices } from '@/actions/deviceActions';
import { PageHeader, Section } from '@/components/Dashboard/primitives';
import { BookmarkButton } from '@/components/Dashboard/primitives/BookmarkButton';
import type { Metadata } from 'next';
import { DevicesCenter } from './_components/DevicesCenter';

export const metadata: Metadata = {
  title: 'دستگاه‌های من | پنل مشتری',
  description: 'مدیریت دستگاه‌های متصل و لغو دسترسی',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CustomerDevicesPage() {
  // auth() حذف شد — layout.tsx احراز هویت را انجام داده است.
  const result = await getMyDevices();
  const initial = result.success ? result.data : [];

  return (
    <div dir="rtl">
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
        actions={<BookmarkButton pageKey="customer-devices" />}
      />
      <Section padding="none">
        <DevicesCenter initial={initial} />
      </Section>
    </div>
  );
}
