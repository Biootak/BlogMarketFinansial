import { getMyDevices, getSecurityAuditLogs } from '@/actions/deviceActions';
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
    redirect('/auth?callbackUrl=/dashboard/devices');
  }

  const [devicesResult, logsResult] = await Promise.all([getMyDevices(), getSecurityAuditLogs()]);

  const devices = devicesResult.success ? devicesResult.data : [];
  const logs = logsResult.success ? logsResult.data : [];

  return (
    <div className="at-page" dir="rtl">
      <DevicesClient devices={devices} securityLogs={logs} />
    </div>
  );
}
