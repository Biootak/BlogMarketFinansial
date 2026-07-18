import { Suspense } from 'react';
import { checkRole } from '@/lib/auth';
import { DashboardProviders } from '@/components/Dashboard/DashboardPage/DashboardProviders';
import { SiteSettingsProvider } from '@/components/SiteSettingsProvider';
import { getSystemSettingsData } from '@/data/getSystemSettings';

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
  const session = await checkRole(['OWNER', 'ADMIN', 'AUTHOR', 'USER']);
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
      <DashboardProviders userRole={session.user.role}>{children}</DashboardProviders>
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
