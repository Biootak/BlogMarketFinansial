import '@/app/dashboard/dashboard.css';
import '@/app/dashboard/dashboard-shell.css';
import { getCustomerProfile } from '@/actions/customer-portal';
import { auth } from '@/auth';
import { AdminCustomerSwitcher } from '@/components/Dashboard/DashboardPage/AdminCustomerSwitcher';
import { DashboardProviders } from '@/components/Dashboard/DashboardPage/DashboardProviders';
import { SiteSettingsProvider } from '@/components/SiteSettingsProvider';
import { getSystemSettingsData } from '@/data/getSystemSettings';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

const PLATFORM_ADMINS = new Set(['OWNER', 'SUPERADMIN', 'ADMIN']);
const ADMIN_CUSTOMER_COOKIE = 'admin_customer_ctx';

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/customer/dashboard');

  const { user } = session;
  const role = user.role as string;
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
      <div className="dashboard-shell" data-portal="customer">
        {isPlatformAdmin && <AdminCustomerSwitcher currentCustomerId={profile.id} currentCustomerName={profile.fullName} currentExchangeName={profile.exchange.name} isImpersonating={hasExplicitCustomer} />}
        <Suspense fallback={null}>
          <DashboardProviders userRole={role} portal="customer">{children}</DashboardProviders>
        </Suspense>
      </div>
    </SiteSettingsProvider>
  );
}
