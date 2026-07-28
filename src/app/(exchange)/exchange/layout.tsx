/**
 * layout.tsx — Exchange Panel
 *
 * دسترسی:
 *   - OWNER / SUPERADMIN / ADMIN پلتفرم: می‌توانند هر صرافی را با ?as=EXCHANGE_ID ببینند.
 *     اگر as نباشد، اولین صرافی فعال نشان داده می‌شود.
 *     ← این نقش‌ها در DashboardProviders به EXCHANGE resolve می‌شوند تا
 *       منوی exchange portal را ببینند، نه منوی ادمین.
 *   - EXCHANGE staff: فقط صرافی خودشان را می‌بینند.
 *   - بقیه: redirect به /dashboard.
 *
 * Tenant isolation: exchangeId از DB resolve می‌شود، نه از JWT.
 * Security: portal='exchange' به DashboardProviders می‌گوید که platform admins
 * باید منوی EXCHANGE دریافت کنند و keyboard shortcuts ادمین غیرفعال باشند.
 */
// dashboard.css is intentionally shared across all three portals (admin/customer/exchange).
// It contains the CSS custom properties and layout classes that all portal shells use.
// Changes to this file will affect all portals — do not add portal-specific rules here.
import '@/app/dashboard/dashboard.css';
import { getExchangeForOwner, getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import { DashboardProviders } from '@/components/Dashboard/DashboardPage/DashboardProviders';
import { SiteSettingsProvider } from '@/components/SiteSettingsProvider';
import { getSystemSettingsData } from '@/data/getSystemSettings';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

const PLATFORM_ADMINS = new Set(['OWNER', 'SUPERADMIN', 'ADMIN']);

export default async function ExchangeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  const userId = session?.user?.id;
  if (!userId) {
    redirect('/auth?callbackUrl=/exchange');
  }

  const { user } = session;
  const role = user.role as string;

  const settings = await getSystemSettingsData();

  // OWNER / SUPERADMIN / ADMIN می‌توانند پنل هر صرافی را ببینند
  if (PLATFORM_ADMINS.has(role)) {
    const membership = await getExchangeForOwner();
    if (!membership) {
      redirect('/dashboard/exchanges');
    }
    return (
      <SiteSettingsProvider
        initialSettings={{
          siteName: settings.siteName,
          siteDescription: settings.siteDescription,
          logoUrl: settings.logoUrl,
        }}
      >
        <Suspense fallback={null}>
          <DashboardProviders userRole={role} portal="exchange" staffRole="OWNER">
            {children}
          </DashboardProviders>
        </Suspense>
      </SiteSettingsProvider>
    );
  }

  const membership = await getExchangeForUser();
  if (!membership) {
    redirect('/');
  }

  if (membership.exchange.status === 'SUSPENDED') {
    redirect('/exchange-suspended');
  }

  return (
    <SiteSettingsProvider
      initialSettings={{
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
        logoUrl: settings.logoUrl,
      }}
    >
      <Suspense fallback={null}>
        <DashboardProviders userRole={role} portal="exchange" staffRole={membership.staffRole}>
          {children}
        </DashboardProviders>
      </Suspense>
    </SiteSettingsProvider>
  );
}
