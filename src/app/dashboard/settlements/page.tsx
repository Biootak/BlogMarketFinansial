import { getSettlements } from '@/actions/settlement';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SettlementClient } from './_components/SettlementClient';

export const metadata: Metadata = {
  title: 'تسویه‌حساب صرافی‌ها | داشبورد',
};

export default async function SettlementsPage() {
  const session = await auth();
  if (!session?.user || !['ADMIN', 'OWNER', 'SUPERADMIN'].includes(session.user.role ?? '')) {
    redirect('/dashboard');
  }

  const settlements = await getSettlements({ limit: 100 });

  return (
    <div className="route-frame" dir="rtl">
      <PageHeader
        variant="compact"
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'تسویه‌حساب' }]}
        title="تسویه‌حساب صرافی‌ها"
        description="مدیریت و پیگیری تسویه‌حساب‌های صرافی‌ها"
        eyebrow="مالی"
        icon="circle-dollar-sign"
        accent="emerald"
      />
      <SettlementClient settlements={settlements} />
    </div>
  );
}
