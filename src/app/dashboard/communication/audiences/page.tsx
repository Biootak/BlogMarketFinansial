import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { getAudiences, getCommunicationSnapshot } from '@/lib/communication';
import { AudiencesView, type AudiencesViewData } from './_components/AudiencesView';

export const dynamic = 'force-dynamic';

export default async function AudiencesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/dashboard/communication/audiences');
  }
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) {
    redirect('/dashboard?error=forbidden');
  }

  const [audiencesResult, snapshotResult] = await Promise.all([
    getAudiences(),
    getCommunicationSnapshot(),
  ]);

  const snapshot = snapshotResult.success ? snapshotResult.data : null;

  const totalTargeted =
    audiencesResult.success && audiencesResult.data
      ? audiencesResult.data.rows.reduce((s, r) => s + r.targetedCount, 0)
      : 0;

  // segment distribution: از announcement + campaign audience
  const distribution: AudiencesViewData['distribution'] = [
    {
      id: 'all',
      label: 'همه',
      count: audiencesResult.data?.rows.find((r) => r.id === 'all')?.count ?? 0,
      tone: 'emerald',
    },
    {
      id: 'role',
      label: 'نقش',
      count:
        audiencesResult.data?.rows
          .filter((r) => r.id.startsWith('role:'))
          .reduce((s, r) => s + r.count, 0) ?? 0,
      tone: 'indigo',
    },
    {
      id: 'segment',
      label: 'سگمنت',
      count: audiencesResult.data?.rows.find((r) => r.id === 'segment')?.count ?? 0,
      tone: 'violet',
    },
  ];

  const viewData: AudiencesViewData = {
    audiences: audiencesResult.success && audiencesResult.data ? audiencesResult.data.rows : [],
    totalUsers:
      audiencesResult.success && audiencesResult.data ? audiencesResult.data.totalUsers : 0,
    totalTargeted,
    distribution,
    activeCampaigns: snapshot?.metrics.activeCampaigns ?? 0,
  };

  return <AudiencesView initialData={viewData} />;
}
