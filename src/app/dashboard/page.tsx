import { auth } from '@/auth';
import { redirect } from 'next/navigation';

import { getPopularPosts } from '@/actions/getPopularPosts';
import { getRecentActivity } from '@/actions/getRecentActivity';
import { getRecentDrafts } from '@/actions/getRecentDrafts';
import { getTopAuthors } from '@/actions/getTopAuthors';
import { getViewStats } from '@/actions/getViewStats';
import { getMarketRates } from '@/actions/market-rates';
import { getScheduledPosts, getStats } from '@/actions/postActions';
import { DashboardCommandSurface } from '@/components/Dashboard/DashboardPage/DashboardCommandSurface';
import { FintechCockpitServer } from '@/components/Dashboard/DashboardPage/FintechCockpitServer';
import { UserHome } from '@/components/Dashboard/DashboardPage/UserHome';
import { AtelierDeck } from '@/components/Dashboard/DashboardPage/atelier';
import prisma from '@/lib/db';

export default async function Dashboard() {
  const initialSession = await auth();
  if (!initialSession?.user) {
    redirect('/auth?callbackUrl=/dashboard');
  }

  const role = initialSession.user.role ?? 'USER';
  const displayName = initialSession.user.name ?? initialSession.user.email ?? '';

  if (role === 'USER' || role === 'SUPPORT') {
    const dbUser = await prisma.user
      .findUnique({
        where: { id: initialSession.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          createdAt: true,
          role: true,
        },
      })
      .catch(() => null);

    if (!dbUser) {
      redirect('/auth?callbackUrl=/dashboard');
    }

    const accountAgeDays = dbUser.createdAt
      ? Math.floor((Date.now() - new Date(dbUser.createdAt).getTime()) / 86_400_000)
      : 999;

    return (
      <DashboardCommandSurface userName={dbUser.name ?? displayName} role={role}>
        <UserHome
          userId={dbUser.id}
          userName={dbUser.name ?? displayName}
          userEmail={dbUser.email}
          emailVerified={!!dbUser.emailVerified}
          accountAgeDays={accountAgeDays}
          role={dbUser.role}
        />
      </DashboardCommandSurface>
    );
  }

  const allowedRoles = new Set(['OWNER', 'ADMIN', 'AUTHOR', 'SUPERADMIN']);
  if (!allowedRoles.has(role)) {
    redirect('/');
  }

  const userRole = role as 'OWNER' | 'ADMIN' | 'AUTHOR' | 'SUPERADMIN';
  const isEditor = userRole === 'AUTHOR' || userRole === 'ADMIN' || userRole === 'OWNER';

  if (isEditor) {
    const [statsResult, scheduledPostsResult, popularPostsResult, recentDraftsResult, viewStatsResult, recentActivityResult, marketRates, topAuthors] = await Promise.all([
      getStats().catch(() => null),
      getScheduledPosts().catch(() => null),
      getPopularPosts().catch(() => null),
      getRecentDrafts().catch(() => null),
      getViewStats().catch(() => null),
      getRecentActivity(8).catch(() => null),
      getMarketRates().catch(() => null),
      getTopAuthors(4).catch(() => null),
    ]);

    const editorialDataOk =
      statsResult?.success &&
      scheduledPostsResult?.success &&
      popularPostsResult?.success &&
      recentDraftsResult?.success &&
      viewStatsResult?.success &&
      statsResult.data &&
      scheduledPostsResult.data &&
      popularPostsResult.data &&
      recentDraftsResult.data &&
      viewStatsResult.data;

    if (editorialDataOk) {
      const recentActivity =
        recentActivityResult?.success && Array.isArray(recentActivityResult.data)
          ? recentActivityResult.data
          : [];

      return (
        <DashboardCommandSurface userName={displayName} role={role}>
          <FintechCockpitServer />
          <AtelierDeck
            stats={statsResult.data}
            scheduledPosts={scheduledPostsResult.data}
            popularPosts={popularPostsResult.data}
            recentDrafts={recentDraftsResult.data}
            viewStats={viewStatsResult.data}
            recentActivity={recentActivity}
            userRole={userRole === 'SUPERADMIN' ? 'ADMIN' : userRole}
            marketRates={marketRates ?? []}
            topAuthors={topAuthors ?? []}
          />
        </DashboardCommandSurface>
      );
    }
  }

  return (
    <DashboardCommandSurface userName={displayName} role={role}>
      <FintechCockpitServer />
    </DashboardCommandSurface>
  );
}
