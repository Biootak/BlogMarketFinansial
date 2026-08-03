import DashboardBottomNavGate from '@/components/Dashboard/DashboardBottomNav/DashboardBottomNavGate';
import { DashboardProviders } from '@/components/Dashboard/DashboardPage/DashboardProviders';
import { SiteSettingsProvider } from '@/components/SiteSettingsProvider';
import { getSystemSettingsData } from '@/data/getSystemSettings';
import { checkRole } from '@/lib/auth';
import { Suspense } from 'react';

/**
 * DashboardGate — async inner component that resolves auth + settings.
 *
 * Isolating the two uncached async calls (auth + settings) here lets the
 * layout wrap them in a `<Suspense>` boundary, so the dashboard shell paints
 * immediately and the auth/settings resolution streams in.
 */
async function DashboardGateInner({
  children,
}: {
  children: React.ReactNode;
}) {
  // checkRole calls auth() — uncached, request-specific
  // 2026-07-07: USER role added so they can access /dashboard/my-requests
  // R8-fix: CUSTOMER, MERCHANT, EXCHANGE, TEST_CUSTOMER are deliberately excluded —
  // they belong to /exchange or public pages, not the admin/blog dashboard.
  const session = await checkRole(['OWNER', 'SUPERADMIN', 'ADMIN', 'SUPPORT', 'AUTHOR', 'USER']);
  // safeCache-backed, but still resolves async — keep inside Suspense
  const settings = await getSystemSettingsData();

  return (
    <SiteSettingsProvider
      initialSettings={{
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
        logoUrl: settings.logoUrl,
      }}
    >
      <DashboardProviders userRole={session.user.role}>
        {children}
        {/* 2026-07-29: Mobile-first bottom nav for the dashboard.
            Mounted here so the role-aware gate can read session. */}
        <DashboardBottomNavGate />
      </DashboardProviders>
    </SiteSettingsProvider>
  );
}

/**
 * DashboardGate — wraps the async gate in a Suspense boundary so the
 * dashboard static shell (nav, sidebar skeleton) can paint immediately
 * while auth + settings resolve in parallel.
 */
export default function DashboardGate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <DashboardGateInner>{children}</DashboardGateInner>
    </Suspense>
  );
}
