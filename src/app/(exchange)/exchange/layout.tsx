import '@/app/dashboard/dashboard.css';
import { getExchangeForOwner, getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import { DashboardCommandSurface } from '@/components/Dashboard/DashboardPage/DashboardCommandSurface';
import { DashboardProviders } from '@/components/Dashboard/DashboardPage/DashboardProviders';
import { SiteSettingsProvider } from '@/components/SiteSettingsProvider';
import { getSystemSettingsData } from '@/data/getSystemSettings';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

const PLATFORM_ADMINS = new Set(['OWNER', 'SUPERADMIN', 'ADMIN']);

export default async function ExchangeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect('/auth?callbackUrl=/exchange');

  const { user } = session;
  const role = user.role as string;
  const settings = await getSystemSettingsData();

  if (PLATFORM_ADMINS.has(role)) {
    const membership = await getExchangeForOwner();
    if (!membership) redirect('/dashboard/exchanges');
    return (
      <SiteSettingsProvider
        initialSettings={{ siteName: settings.siteName, siteDescription: settings.siteDescription, logoUrl: settings.logoUrl }}
      >
        <Suspense fallback={null}>
          <DashboardProviders userRole={role} portal="exchange" staffRole="OWNER">
            <DashboardCommandSurface userName={membership.exchange.name} role={role}>
              {children}
            </DashboardCommandSurface>
          </DashboardProviders>
        </Suspense>
      </SiteSettingsProvider>
    );
  }

  const membership = await getExchangeForUser();
  if (!membership) redirect('/');
  if (membership.exchange.status === 'SUSPENDED') redirect('/exchange-suspended');

  return (
    <SiteSettingsProvider
      initialSettings={{ siteName: settings.siteName, siteDescription: settings.siteDescription, logoUrl: settings.logoUrl }}
    >
      <Suspense fallback={null}>
        <DashboardProviders userRole={role} portal="exchange" staffRole={membership.staffRole}>
          <DashboardCommandSurface userName={membership.exchange.name} role={role}>
            {children}
          </DashboardCommandSurface>
        </DashboardProviders>
      </Suspense>
    </SiteSettingsProvider>
  );
}
