import { auth } from '@/auth';
import { getCampaignById } from '@/lib/communication';
import { notFound, redirect } from 'next/navigation';
import { CampaignDetail } from './_components/CampaignDetail';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'جزئیات کمپین | داشبورد',
};

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth?callbackUrl=/dashboard/communication/campaigns/${id}`);
  }
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) {
    redirect('/dashboard?error=forbidden');
  }

  const result = await getCampaignById(id);
  if (!result.success || !result.data) {
    notFound();
  }
  return <CampaignDetail campaign={result.data} />;
}
