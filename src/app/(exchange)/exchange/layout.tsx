import '@/app/dashboard/dashboard.css';
import '@/app/dashboard/dashboard-shell.css';
import { getExchangeForOwner, getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import { DashboardProviders } from '@/components/Dashboard/DashboardPage/DashboardProviders';
import { SiteSettingsProvider } from '@/components/SiteSettingsProvider';
import { getSystemSettingsData } from '@/data/getSystemSettings';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';
const PLATFORM_ADMINS = new Set(['OWNER', 'SUPERADMIN', 'ADMIN']);

export default async function ExchangeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect('/auth?callbackUrl=/exchange');

  const { user } = session;
  const role = user.role as string;
  const settings = await getSystemSettingsData();
  const initialSettings = {
    siteName: settings.siteName,
    siteDescription: settings.siteDescription,
    logoUrl: settings.logoUrl,
  };

  if (PLATFORM_ADMINS.has(role)) {
    const membership = await getExchangeForOwner();
    if (!membership) redirect('/dashboard/exchanges');
    return (
      <SiteSettingsProvider initialSettings={initialSettings}>
        <div className="dashboard-shell" data-portal="exchange">
          <Suspense fallback={null}>
            <DashboardProviders userRole={role} portal="exchange" staffRole="OWNER">
              {children}
            </DashboardProviders>
          </Suspense>
        </div>
      </SiteSettingsProvider>
    );
  }

  const membership = await getExchangeForUser();
  if (!membership) redirect('/');
  if (membership.exchange.status === 'SUSPENDED') redirect('/exchange-suspended');

  return (
    <SiteSettingsProvider initialSettings={initialSettings}>
      <div className="dashboard-shell" data-portal="exchange">
        <Suspense fallback={null}>
          <DashboardProviders userRole={role} portal="exchange" staffRole={membership.staffRole}>
            {children}
          </DashboardProviders>
        </Suspense>
      </div>
    </SiteSettingsProvider>
  );
}
