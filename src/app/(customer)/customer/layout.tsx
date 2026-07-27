/**
 * layout.tsx — Customer Portal
 *
 * دسترسی:
 *   - CUSTOMER / TEST_CUSTOMER / MERCHANT: Customer record خودشان
 *   - OWNER / SUPERADMIN / ADMIN پلتفرم: می‌توانند وارد شوند (برای پشتیبانی)
 *     ← این نقش‌ها در DashboardProviders به CUSTOMER resolve می‌شوند تا
 *       منوی customer portal را ببینند، نه منوی ادمین.
 *   - بقیه: redirect به /
 *
 * Tenant isolation: customerId از DB resolve می‌شود، نه از JWT.
 * Security: portal='customer' به DashboardProviders می‌گوید که platform admins
 * باید منوی CUSTOMER دریافت کنند و keyboard shortcuts ادمین غیرفعال باشند.
 */
// dashboard.css is intentionally shared across all three portals (admin/customer/exchange).
// It contains the CSS custom properties and layout classes that all portal shells use.
// Changes to this file will affect all portals — do not add portal-specific rules here.
import '@/app/dashboard/dashboard.css';
import { getCustomerProfile } from '@/actions/customer-portal';
import { auth } from '@/auth';
import { DashboardProviders } from '@/components/Dashboard/DashboardPage/DashboardProviders';
import { SiteSettingsProvider } from '@/components/SiteSettingsProvider';
import { getSystemSettingsData } from '@/data/getSystemSettings';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

const PLATFORM_ADMINS = new Set(['OWNER', 'SUPERADMIN', 'ADMIN']);

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/customer/dashboard');
  }

  const { user } = session;
  const role = user.role as string;

  const [profile, settings] = await Promise.all([getCustomerProfile(), getSystemSettingsData()]);

  if (!profile) {
    if (PLATFORM_ADMINS.has(role)) {
      redirect('/dashboard');
    }
    redirect('/');
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
        <DashboardProviders userRole={role} portal="customer">
          {children}
        </DashboardProviders>
      </Suspense>
    </SiteSettingsProvider>
  );
}
