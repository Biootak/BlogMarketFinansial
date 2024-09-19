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

  if (
    !session ||
    !session.user ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'AUTHOR')
  ) {
    redirect('/signin');
    return null; // Return null to avoid rendering the layout if user is not authorized
  }

  return (
    <>
      <SidebarInitializer />
      <div
        className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors duration-200"
        dir="rtl"
      >
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <MainContent>{children}</MainContent>
        </div>
      </div>
    </>
  );
}
