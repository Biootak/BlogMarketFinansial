import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { AnnouncementsList } from '@/app/dashboard/communication/announcements/_components/AnnouncementsList';
import { getCommunicationSnapshot } from '@/lib/communication';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'اعلان‌ها | داشبورد',
};

export default async function AnnouncementsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/dashboard/communication/announcements');
  }
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) {
    redirect('/dashboard?error=forbidden');
  }

  const result = await getCommunicationSnapshot();
  const data = result.success ? result.data : null;

  return (
    <div dir="rtl">
      <AnnouncementsList items={data?.announcements ?? []} />
    </div>
  );
}
