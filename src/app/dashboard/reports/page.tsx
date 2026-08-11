import { auth } from '@/auth';
/**
 * /dashboard/reports — گزارش‌های مدیریتی
 *
 * Server Component wrapper با auth guard.
 * محتوای تعاملی (tab switcher) در ReportsShell (client) است.
 */
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ReportsShell from './_components/ReportsShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'گزارش‌ها | داشبورد',
  description: 'گزارش‌های سیستمی، فعالیت‌ها و لاگ‌های رویداد',
};

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/dashboard/reports');
  }
  const role = session.user.role ?? '';
  // 2026-08-11: reports are owner-only — SUPERADMIN is an elevated ADMIN,
  // not an OWNER alias, and does not see financial reports.
  if (!['OWNER'].includes(role)) {
    redirect('/forbidden');
  }

  return (
    <div className="route-frame">
      <PageHeader
        variant="compact"
        eyebrow="تحلیل"
        title="گزارش‌ها"
        description="گزارش‌های سیستمی، فعالیت‌ها و لاگ‌های رویداد"
        icon="bar-chart-3"
        accent="emerald"
      />
      <ReportsShell />
    </div>
  );
}
