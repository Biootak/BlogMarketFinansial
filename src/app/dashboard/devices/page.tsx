import { getMyDevices } from '@/actions/deviceActions';
import { auth } from '@/auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DevicesClient } from './_components/DevicesClient';

export const metadata: Metadata = {
  title: 'دستگاه‌های من | داشبورد',
  description: 'مدیریت دستگاه‌های متصل به حساب',
};

export default async function DevicesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/signin?callbackUrl=/dashboard/devices');
  }

  const result = await getMyDevices();
  const devices = result.success ? result.data : [];

  return (
    <div className="at-page" dir="rtl">
      <DevicesClient devices={devices} />
    </div>
  );
}
