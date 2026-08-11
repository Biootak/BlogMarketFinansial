import { getNotifications, getNotificationsCount } from '@/actions/notification-actions';
import { auth } from '@/auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import NotificationsClient from './_components/NotificationsClient';

export const metadata: Metadata = {
  title: 'اعلان‌ها | داشبورد',
  description: 'مرکز اعلان‌های سیستم',
};

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth?callbackUrl=/dashboard/notifications');

  const [notifications, total] = await Promise.all([
    getNotifications({ limit: 50 }),
    getNotificationsCount(),
  ]);

  return (
    <div className="route-frame" dir="rtl">
      <NotificationsClient notifications={notifications} total={total} />
    </div>
  );
}
