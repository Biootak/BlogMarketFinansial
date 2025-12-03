import { checkRole } from '@/lib/auth';
import Header from '@/components/Dashboard/DashboardPage/Header';
import Sidebar from '@/components/Dashboard/DashboardPage/Sidebar';
import SidebarInitializer from '@/components/Dashboard/DashboardPage/SidebarInitializer';
import MainContent from '@/components/Dashboard/DashboardPage/MainContent';
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
    <SiteSettingsProvider initialSettings={settings}>
      <div
        className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300"
        dir="rtl"
      >
        <SidebarInitializer />
        <Sidebar userRole={user.role} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <MainContent>{children}</MainContent>
        </div>
      </div>
    </SiteSettingsProvider>
  );
}
