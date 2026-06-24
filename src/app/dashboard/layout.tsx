import { checkRole } from '@/lib/auth';
import { DashboardProviders } from '@/components/Dashboard/DashboardPage/DashboardProviders';
import { SiteSettingsProvider } from '@/components/SiteSettingsProvider';
import { getSystemSettingsData } from '@/data/getSystemSettings';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // فقط بررسی اولیه برای اطمینان از لاگین بودن کاربر
  const user = await checkRole(['SUPER_ADMIN', 'ADMIN', 'AUTHOR']);
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
