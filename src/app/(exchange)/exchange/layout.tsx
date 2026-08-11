import '@/app/dashboard/dashboard.css';
import '@/app/dashboard/dashboard-shell.css';
import { getExchangeForOwner, getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import { DashboardProviders } from '@/components/Dashboard/DashboardPage/DashboardProviders';
import UniversalCommandPalette from '@/components/Dashboard/DashboardPage/UniversalCommandPalette';
import { SiteSettingsProvider } from '@/components/SiteSettingsProvider';
import { getSystemSettingsData } from '@/data/getSystemSettings';
import prisma from '@/lib/db';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';
const PLATFORM_ADMINS = new Set(['OWNER', 'SUPERADMIN', 'ADMIN']);

export default async function ExchangeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect('/auth?callbackUrl=/exchange');

  // 2FA اجباری برای حساب مالک — بدون فعال‌سازی، داشبورد صرافی باز نمی‌شود
  const { user } = session;
  const role = user.role as string;
  if (PLATFORM_ADMINS.has(role)) {
    const twoFaUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });
    // بدون 2FA، داشبورد صرافی برای مالک باز نمی‌شود — به صفحهٔ فعال‌سازی برو
    if (!twoFaUser?.twoFactorEnabled) redirect('/2fa-setup');
  }
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
          <UniversalCommandPalette portal="exchange" />
        </div>
      </SiteSettingsProvider>
    );
  }

  const membership = await getExchangeForUser();
  if (!membership) redirect('/');
  if (membership.exchange.status === 'SUSPENDED') redirect('/exchange-suspended');

  const exchangeRole: 'OWNER' | 'SUPERADMIN' | 'ADMIN' = 'OWNER';
  return (
    <SiteSettingsProvider initialSettings={initialSettings}>
      <div className="dashboard-shell" data-portal="exchange">
        <Suspense fallback={null}>
          <DashboardProviders userRole={role} portal="exchange" staffRole={membership.staffRole}>
            {children}
          </DashboardProviders>
        </Suspense>
        <UniversalCommandPalette
          portal="exchange"
          role={exchangeRole}
          exchangeName={membership.exchange.name}
        />
      </div>
    </SiteSettingsProvider>
  );
}
