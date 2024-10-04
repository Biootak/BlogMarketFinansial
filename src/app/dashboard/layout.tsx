import { auth } from '@/auth';
import Header from '@/components/Dashboard/DashboardPage/Header';
import MainContent from '@/components/Dashboard/DashboardPage/MainContent';
import Sidebar from '@/components/Dashboard/DashboardPage/Sidebar';
import SidebarInitializer from '@/components/Dashboard/DashboardPage/SidebarInitializer';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || !session.user) {
    redirect('/signin');
    return null;
  }

  const hasPermission = session.user.role === 'ADMIN' || session.user.role === 'AUTHOR';
  if (!hasPermission) {
    redirect('/unauthorized');
    return null;
  }
  return (
    <div
      className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors duration-200"
      dir="rtl"
    >
      <SidebarInitializer />
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <MainContent>{children}</MainContent>
      </div>
    </div>
  );
}
