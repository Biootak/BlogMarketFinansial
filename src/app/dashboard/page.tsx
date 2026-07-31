import { auth } from '@/auth';
import { redirect } from 'next/navigation';

import { getPopularPosts } from '@/actions/getPopularPosts';
import { getRecentActivity } from '@/actions/getRecentActivity';
import { getRecentDrafts } from '@/actions/getRecentDrafts';
import { getTopAuthors } from '@/actions/getTopAuthors';
import { getViewStats } from '@/actions/getViewStats';
import { getMarketRates } from '@/actions/market-rates';
import { getScheduledPosts, getStats } from '@/actions/postActions';
// 2026-07-31: بازطراحی یکپارچه داشبورد.
//
// قبلاً ۴ کامپوننت مستقل (AtelierDeck + FintechKpiWidget +
// LiveOpsPulse + ServiceRequestsWidget) روی هم چیده می‌شد که هر کدام
// زبان بصری خودشان را داشتند و صفحه را تکه‌تکه نشان می‌داد.
//
// حالا برای نقش‌های ادمین/مالک/نویسنده/سوپرادمین:
//   - FintechCockpitServer → یکپارچه و coheisve (Hero + KPI strip +
//     Services + Live Ops + Quick Actions همگی در یک زبان بصری)
//   - Editorial deck هنوز به‌عنوان ردیف اختیاری پایین FintechCockpit
//     نمایش داده می‌شود (اگر داده موجود باشد)
//
// برای نقش USER/SUPPORT: همان UserHome بهینه‌سازی‌شده با tokens.
import { AtelierDeck } from '@/components/Dashboard/DashboardPage/atelier';
import { FintechCockpitServer } from '@/components/Dashboard/DashboardPage/FintechCockpitServer';
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
  const isEditor = userRole === 'AUTHOR' || userRole === 'ADMIN' || userRole === 'OWNER';

  // Editorial data — only fetched if user is editor (or owner).
  // Failures fall back to `[]` so the editorial row degrades gracefully
  // and never breaks the page.
  if (isEditor) {
    const [
      statsResult,
      scheduledPostsResult,
      popularPostsResult,
      recentDraftsResult,
      viewStatsResult,
      recentActivityResult,
      marketRates,
      topAuthors,
    ] = await Promise.all([
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
        <>
          <FintechCockpitServer />
          <AtelierDeck
            stats={statsResult!.data!}
            scheduledPosts={scheduledPostsResult!.data!}
            popularPosts={popularPostsResult!.data!}
            recentDrafts={recentDraftsResult!.data!}
            viewStats={viewStatsResult!.data!}
            recentActivity={recentActivity}
            userRole={userRole}
            marketRates={marketRates}
            topAuthors={topAuthors}
          />
        </>
      );
    }
  }

  return <FintechCockpitServer />;
}
