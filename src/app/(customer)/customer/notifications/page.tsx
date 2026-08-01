/**
 * /customer/notifications — اعلان‌های مشتری
 */
import { getCustomerNotifications } from '@/actions/customer-portal';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import NotificationsContent from './_components/NotificationsContent';

export const metadata: Metadata = {
  title: 'اعلان‌ها',
  description: 'پیام‌ها و اعلان‌های حساب',
};

export const dynamic = 'force-dynamic';

export default async function CustomerNotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/customer/notifications');

  const notifications = await getCustomerNotifications(50);

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        title="اعلان‌ها"
        description={`${new Intl.NumberFormat('fa-IR').format(notifications.filter((n) => !n.isRead).length)} اعلان خوانده‌نشده`}
        breadcrumb={[{ label: 'پورتال مشتری' }, { label: 'اعلان‌ها' }]}
        icon="bell"
      />
      <NotificationsContent notifications={notifications} />
    </div>
  );
}
