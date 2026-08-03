import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { getAudiences, getCommunicationNexus, getCommunicationSnapshot } from '@/lib/communication';
import type { CommunicationNexus } from '@/lib/communication';
import { CommunicationHub } from './_components/CommunicationHub';
import type { CommunicationHubData } from './_components/types';

export const dynamic = 'force-dynamic';

export default async function CommunicationPage() {
  // ۱. Auth — admin-only
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/dashboard/communication');
  }
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) {
    redirect('/dashboard?error=forbidden');
  }

  // ۲. واکشی موازی از DB — فقط ۳ query (نه ۴)
  const [snapshotResult, nexusResult, audiencesResult] = await Promise.all([
    getCommunicationSnapshot(),
    getCommunicationNexus(),
    getAudiences(),
  ]);

  // ۳. ساخت snapshot نهایی
  const defaultExtras = {
    series24h: [] as number[],
    recentActivity: [] as import('./_components/types').RecentActivityItem[],
    channelMix: {
      channels: [
        {
          id: 'push' as const,
          label: 'Push',
          tone: 'emerald' as const,
          announcementCount: 0,
          campaignCount: 0,
          sent: 0,
          recipients: 0,
        },
        {
          id: 'email' as const,
          label: 'Email',
          tone: 'emerald' as const,
          announcementCount: 0,
          campaignCount: 0,
          sent: 0,
          recipients: 0,
        },
        {
          id: 'sms' as const,
          label: 'SMS',
          tone: 'amber' as const,
          announcementCount: 0,
          campaignCount: 0,
          sent: 0,
          recipients: 0,
        },
        {
          id: 'inapp' as const,
          label: 'In-app',
          tone: 'emerald' as const,
          announcementCount: 0,
          campaignCount: 0,
          sent: 0,
          recipients: 0,
        },
      ],
      total: { sent: 0, recipients: 0, announcements: 0, campaigns: 0 },
    },
  };
  const audienceExtras = {
    audienceCount:
      audiencesResult.success && audiencesResult.data ? audiencesResult.data.rows.length : 0,
    totalUsers:
      audiencesResult.success && audiencesResult.data ? audiencesResult.data.totalUsers : 0,
  };
  const hub: CommunicationHubData =
    snapshotResult.success && snapshotResult.data
      ? {
          ...defaultExtras,
          ...snapshotResult.data,
          ...audienceExtras,
        }
      : {
          generatedAt: new Date().toISOString(),
          announcements: [],
          campaigns: [],
          metrics: {
            publishedAnnouncements: 0,
            scheduledAnnouncements: 0,
            draftAnnouncements: 0,
            activeCampaigns: 0,
            totalRecipients: 0,
            totalSent: 0,
            openRate: 0,
            clickRate: 0,
          },
          series24h: [],
          recentActivity: [],
          channelMix: {
            channels: [
              {
                id: 'push' as const,
                label: 'Push',
                tone: 'emerald' as const,
                announcementCount: 0,
                campaignCount: 0,
                sent: 0,
                recipients: 0,
              },
              {
                id: 'email' as const,
                label: 'Email',
                tone: 'emerald' as const,
                announcementCount: 0,
                campaignCount: 0,
                sent: 0,
                recipients: 0,
              },
              {
                id: 'sms' as const,
                label: 'SMS',
                tone: 'amber' as const,
                announcementCount: 0,
                campaignCount: 0,
                sent: 0,
                recipients: 0,
              },
              {
                id: 'inapp' as const,
                label: 'In-app',
                tone: 'emerald' as const,
                announcementCount: 0,
                campaignCount: 0,
                sent: 0,
                recipients: 0,
              },
            ],
            total: { sent: 0, recipients: 0, announcements: 0, campaigns: 0 },
          },
          audienceCount:
            audiencesResult.success && audiencesResult.data ? audiencesResult.data.rows.length : 0,
          totalUsers:
            audiencesResult.success && audiencesResult.data ? audiencesResult.data.totalUsers : 0,
        };

  const nexus: CommunicationNexus =
    nexusResult.success && nexusResult.data
      ? nexusResult.data
      : {
          generatedAt: new Date(0).toISOString(),
          heatmap: {
            cells: Array.from({ length: 7 * 24 }, (_, i) => ({
              dayIdx: Math.floor(i / 24),
              hour: i % 24,
              count: 0,
            })),
            dailyTotals: [0, 0, 0, 0, 0, 0, 0],
            max: 0,
          },
          pipeline: {
            draft: [],
            scheduled: [],
            sending: [],
            completed: [],
            counts: { draft: 0, scheduled: 0, sending: 0, completed: 0 },
          },
          channelTimeline: { push: [], email: [], sms: [], inapp: [] },
          channelRadar: { channels: [] },
        };

  return <CommunicationHub hub={hub} nexus={nexus} />;
}
