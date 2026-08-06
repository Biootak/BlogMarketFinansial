import '@/app/dashboard/dashboard.css';
import { getCustomerProfile } from '@/actions/customer-portal';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';
import { AdminCustomerSwitcher } from '@/components/Dashboard/DashboardPage/AdminCustomerSwitcher';
import { DashboardCommandSurface } from '@/components/Dashboard/DashboardPage/DashboardCommandSurface';
import { DashboardProviders } from '@/components/Dashboard/DashboardPage/DashboardProviders';
import { SiteSettingsProvider } from '@/components/SiteSettingsProvider';
import { getSystemSettingsData } from '@/data/getSystemSettings';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

const PLATFORM_ADMINS = new Set(['OWNER', 'SUPERADMIN', 'ADMIN']);
const ADMIN_CUSTOMER_COOKIE = 'admin_customer_ctx';

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/customer/dashboard');
  const role = session.user.role as string;
  const isPlatformAdmin = PLATFORM_ADMINS.has(role);
  const [profile, settings] = await Promise.all([getCustomerProfile(), getSystemSettingsData()]);
  if (!profile) {
    if (isPlatformAdmin) redirect('/dashboard');
    redirect('/money-transfer#contact');
  }
  const cookieStore = await cookies();
  const hasExplicitCustomer = isPlatformAdmin && !!cookieStore.get(ADMIN_CUSTOMER_COOKIE)?.value;

  return (
    <SiteSettingsProvider initialSettings={{ siteName: settings.siteName, siteDescription: settings.siteDescription, logoUrl: settings.logoUrl }}>
      {isPlatformAdmin ? <AdminCustomerSwitcher currentCustomerId={profile.id} currentCustomerName={profile.fullName} currentExchangeName={profile.exchange.name} isImpersonating={hasExplicitCustomer} /> : null}
      <Suspense fallback={null}>
        <DashboardProviders userRole={role} portal="customer">
          <DashboardCommandSurface portal="customer" userName={profile.fullName} role={role}>{children}</DashboardCommandSurface>
        </DashboardProviders>
      </Suspense>
    </SiteSettingsProvider>
  );
}
