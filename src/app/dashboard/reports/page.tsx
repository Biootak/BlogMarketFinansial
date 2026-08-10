/**
 * /dashboard/reports — گزارش‌های مدیریتی
 *
 * Server Component wrapper با auth guard.
 * محتوای تعاملی (tab switcher) در ReportsShell (client) است.
 */
import { auth } from '@/auth';
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
  if (!['OWNER', 'SUPERADMIN'].includes(role)) {
    redirect('/forbidden');
  }

  return <ReportsShell />;
}
