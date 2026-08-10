import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { NewCampaignForm } from './_components/NewCampaignForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'اعلان جدید | داشبورد',
};

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ audience?: string }>;
}) {
  const { audience } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/dashboard/communication/campaigns/new');
  }
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) {
    redirect('/forbidden');
  }

  return <NewCampaignForm initialAudience={audience ?? null} />;
}
