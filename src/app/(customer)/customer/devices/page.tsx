/**
 * /customer/devices — Security Intelligence & Session Operations Center
 *
 * نسخهٔ Customer Portal از DevicesClient داشبورد.
 * همان عملکرد (مشاهده، اعتماد، لغو، لغو گروهی) با تم Customer Portal.
 */

import DevicesClient, {
  type DeviceRow,
  type SecurityLog,
} from '@/app/dashboard/devices/_components/DevicesClient';
import { getMyDevices, getSecurityAuditLogs } from '@/actions/deviceActions';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives/PageHeader';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'دستگاه‌های من | پنل مشتری',
  description: 'مدیریت دستگاه‌های متصل به حساب مشتری',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CustomerDevicesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/customer/devices');
  }

  const [devicesResult, logsResult] = await Promise.all([
    getMyDevices(),
    getSecurityAuditLogs(),
  ]);

  const devices: DeviceRow[] = devicesResult.success ? devicesResult.data : [];
  const logs: SecurityLog[] = logsResult.success ? logsResult.data : [];

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        eyebrow="امنیت"
        title="دستگاه‌های متصل"
        description="نشست‌های فعال حساب شما. هر دستگاه ناشناس را فوراً لغو کنید."
        breadcrumb={[
          { href: '/customer/dashboard', label: 'پنل مشتری' },
          { label: 'دستگاه‌ها' },
        ]}
        icon="shield-check"
        accent="emerald"
      />
      <DevicesClient devices={devices} securityLogs={logs} />
    </div>
  );
}
