import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Header from '@/components/Dashboard/DashboardPage/Header';
import Sidebar from '@/components/Dashboard/DashboardPage/Sidebar';
import type { Role } from '@prisma/client';
import SidebarInitializer from '@/components/Dashboard/DashboardPage/SidebarInitializer';
import MainContent from '@/components/Dashboard/DashboardPage/MainContent';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/signin');
  }

  const userRole = session?.user?.role || 'USER';
  const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'AUTHOR'];
  
  if (!allowedRoles.includes(userRole)) {
    redirect('/');
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
