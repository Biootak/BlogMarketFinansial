/**
 * صفحه مدیریت کارکنان صراف‌ها — فقط OWNER و ADMIN پلتفرم
 */
import { getAllStaff } from '@/actions/exchange-staff';
import { getAllExchanges } from '@/actions/exchanges';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ExchangeStaffClient from './_components/ExchangeStaffClient';

export const metadata: Metadata = {
  title: 'کارکنان صراف‌ها | داشبورد',
};

export default async function ExchangeStaffPage() {
  const session = await auth();
  // SUPERADMIN = OWNER alias (G8-fix) — middleware ADMIN_ROLES already
  // lets SUPERADMIN through; keep the page check in sync.
  if (!session?.user || !['OWNER', 'SUPERADMIN', 'ADMIN'].includes(session.user.role as string)) {
    redirect('/dashboard');
  }

  const [staff, exchanges] = await Promise.all([getAllStaff(), getAllExchanges()]);

  return (
    <div className="route-frame" dir="rtl">
      <PageHeader
        variant="compact"
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'کارکنان صراف‌ها' }]}
        title="کارکنان صراف‌ها"
        description="مدیریت دسترسی کارکنان صرافی‌های ثبت‌شده"
        eyebrow="مدیریت"
        icon="users"
        accent="cyan"
      />
      <ExchangeStaffClient staff={staff} exchanges={exchanges} />
    </div>
  );
}
