import { NewCampaignForm } from '@/app/dashboard/communication/campaigns/new/_components/NewCampaignForm';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'اعلان جدید | داشبورد',
};

export default async function NewAnnouncementPage({
  searchParams,
}: {
  searchParams: Promise<{ audience?: string }>;
}) {
  const { audience } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/dashboard/communication/announcements/new');
  }
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) {
    redirect('/dashboard?error=forbidden');
  }

  return <NewCampaignForm initialAudience={audience ?? null} />;
}
