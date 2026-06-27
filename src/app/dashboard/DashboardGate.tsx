import { Suspense } from 'react';
import { checkRole } from '@/lib/auth';
import { DashboardProviders } from '@/components/Dashboard/DashboardPage/DashboardProviders';
import { SiteSettingsProvider } from '@/components/SiteSettingsProvider';
import { getSystemSettingsData } from '@/data/getSystemSettings';

/**
 * DashboardGate — async inner component that resolves auth + settings.
 *
 * 2026-06-26: Under Next.js 16 `cacheComponents: true`, any uncached
 * async data access (like `auth()`) must happen inside a `<Suspense>`
 * boundary so the static shell can stream first. This component isolates
 * the two uncached calls (auth + settings) from the layout itself.
 */
async function DashboardGateInner({
  children,
}: {
  children: React.ReactNode;
}) {
  // checkRole calls auth() — uncached, request-specific
  const user = await checkRole(['SUPER_ADMIN', 'ADMIN', 'AUTHOR']);
  // safeCache-backed, but still resolves async — keep inside Suspense
  const settings = await getSystemSettingsData();

  return (
    <SiteSettingsProvider
      initialSettings={{
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
      }}
    >
      <DashboardProviders userRole={user.role}>{children}</DashboardProviders>
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
