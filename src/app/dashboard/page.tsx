import { auth } from '@/auth';
import { notFound, redirect } from 'next/navigation';

import { getFintechKpiData } from '@/actions/getFintechKpiData';
import { getPopularPosts } from '@/actions/getPopularPosts';
import { getRecentActivity } from '@/actions/getRecentActivity';
import { getRecentDrafts } from '@/actions/getRecentDrafts';
import { getTopAuthors } from '@/actions/getTopAuthors';
import { getViewStats } from '@/actions/getViewStats';
import { getMarketRates } from '@/actions/market-rates';
import { getScheduledPosts, getStats } from '@/actions/postActions';
// 2026-07-04: Replaced Editorial Command (typography-only, 5-row, single
// emerald accent) with Atelier 2026 — Persian-modern redesign with a
// live market ticker band, radial pulse chart, brand mark, 7-day strip,
// 2x2 market grid, gold "lead" accents, and gradient hero. Visual
// language still hairline-only (no glass) and emerald-first, but the
// composition gains a clear focal point (the pulse + today number) and
// a real-time data layer (the ticker). Editorial module kept on disk
// for rollback.
import { AtelierDeck } from '@/components/Dashboard/DashboardPage/atelier';
import { LiveOpsPulseServer } from '@/components/Dashboard/DashboardPage/LiveOpsPulseServer';
import { FintechKpiWidget } from '@/components/Dashboard/FintechKpi/FintechKpiWidget';
import ServiceRequestsWidget from '@/components/Dashboard/ServiceRequests/ServiceRequestsWidget';
import { UserHome } from '@/components/Dashboard/DashboardPage/UserHome';
import { checkRole } from '@/lib/auth';
import prisma from '@/lib/db';

export default async function Dashboard() {
  // 2026-07-29: USER role gets a clean user-facing home (not admin
  // Atelier). Routing at the page-level keeps the layout/Sidebar
  // happy and avoids redirect ping-pong.
  // 2026-07-31: SUPPORT هم مثل USER فقط به baseDashboardRoutes دسترسی دارد
  // (sidebar فقط dashboard/my-requests/devices/profile را نشان می‌دهد)؛
  // بنابراین همان UserHome را می‌بیند تا صفحه خالی یا redirect به / نبیند.
  const initialSession = await auth();
  if (!initialSession?.user) {
    redirect('/auth?callbackUrl=/dashboard');
  }

  if (initialSession.user.role === 'USER' || initialSession.user.role === 'SUPPORT') {
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
      <UserHome
        userId={dbUser.id}
        userName={dbUser.name ?? initialSession.user.name ?? ''}
        userEmail={dbUser.email}
        emailVerified={!!dbUser.emailVerified}
        accountAgeDays={accountAgeDays}
        role={dbUser.role}
      />
    );
  }

  // Check user role before loading any data
  await checkRole(['OWNER', 'ADMIN', 'AUTHOR', 'SUPERADMIN']);

  const session = await auth();

  if (!session?.user) {
    redirect('/auth?callbackUrl=/dashboard');
  }

  const userRole = (session.user.role ?? 'AUTHOR') as 'OWNER' | 'ADMIN' | 'AUTHOR';

  const [
    statsResult,
    scheduledPostsResult,
    popularPostsResult,
    recentDraftsResult,
    viewStatsResult,
    recentActivityResult,
    marketRates,
    topAuthors,
    fintechKpi,
  ] = await Promise.all([
    getStats(),
    getScheduledPosts(),
    getPopularPosts(),
    getRecentDrafts(),
    getViewStats(),
    getRecentActivity(8),
    getMarketRates(),
    getTopAuthors(4),
    getFintechKpiData(),
  ]);

  if (
    !statsResult.success ||
    !scheduledPostsResult.success ||
    !popularPostsResult.success ||
    !recentDraftsResult.success ||
    !viewStatsResult.success
  ) {
    return notFound();
  }

  if (
    !statsResult.data ||
    !scheduledPostsResult.data ||
    !popularPostsResult.data ||
    !recentDraftsResult.data ||
    !viewStatsResult.data
  ) {
    return notFound();
  }

  const isAdmin = userRole === 'ADMIN' || userRole === 'OWNER';

  // Activity feed: silently fall back to [] on failure (decorative).
  const recentActivity =
    recentActivityResult.success && Array.isArray(recentActivityResult.data)
      ? recentActivityResult.data
      : [];

  return (
    <>
      <AtelierDeck
        stats={statsResult.data}
        scheduledPosts={scheduledPostsResult.data}
        popularPosts={popularPostsResult.data}
        recentDrafts={recentDraftsResult.data}
        viewStats={viewStatsResult.data}
        recentActivity={recentActivity}
        userRole={userRole}
        marketRates={marketRates}
        topAuthors={topAuthors}
      />
      {isAdmin && (
        <div className="px-4 sm:px-6 lg:px-8 pb-4">
          <FintechKpiWidget data={fintechKpi} />
        </div>
      )}
      {isAdmin && (
        <div className="px-4 sm:px-6 lg:px-8 pb-4">
          <LiveOpsPulseServer />
        </div>
      )}
      {isAdmin && (
        <div className="px-4 sm:px-6 lg:px-8 pb-8">
          <ServiceRequestsWidget />
        </div>
      )}
    </>
  );
}
