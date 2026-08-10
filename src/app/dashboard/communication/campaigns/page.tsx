import { redirect } from 'next/navigation';

import { CampaignsList } from '@/app/dashboard/communication/campaigns/_components/CampaignsList';
import { auth } from '@/auth';
import { getCommunicationSnapshot } from '@/lib/communication';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'کمپین‌ها | داشبورد',
};

export default async function CampaignsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/dashboard/communication/campaigns');
  }
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) {
    redirect('/forbidden');
  }

  const result = await getCommunicationSnapshot();
  const data = result.success ? result.data : null;

  return (
    <div dir="rtl">
      <CampaignsList items={data?.campaigns ?? []} />
    </div>
  );
}
