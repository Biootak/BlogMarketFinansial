import '@/app/dashboard/dashboard.css';
import { getExchangeForOwner, getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import { DashboardCommandSurface } from '@/components/Dashboard/primitives';
import { DashboardProviders } from '@/components/Dashboard/DashboardPage/DashboardProviders';
import { SiteSettingsProvider } from '@/components/SiteSettingsProvider';
import { getSystemSettingsData } from '@/data/getSystemSettings';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

const PLATFORM_ADMINS = new Set(['OWNER', 'SUPERADMIN', 'ADMIN']);

export default async function ExchangeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange');
  const role = session.user.role as string;
  const settings = await getSystemSettingsData();
  const membership = PLATFORM_ADMINS.has(role) ? await getExchangeForOwner() : await getExchangeForUser();
  if (!membership) redirect(PLATFORM_ADMINS.has(role) ? '/dashboard/exchanges' : '/');
  if (membership.exchange.status === 'SUSPENDED') redirect('/exchange-suspended');

  return (
    <SiteSettingsProvider initialSettings={{ siteName: settings.siteName, siteDescription: settings.siteDescription, logoUrl: settings.logoUrl }}>
      <Suspense fallback={null}>
        <DashboardProviders userRole={role} portal="exchange" staffRole={PLATFORM_ADMINS.has(role) ? 'OWNER' : membership.staffRole}>
          <DashboardCommandSurface portal="exchange" userName={membership.exchange.name} role={role}>{children}</DashboardCommandSurface>
        </DashboardProviders>
      </Suspense>
    </SiteSettingsProvider>
  );
}
