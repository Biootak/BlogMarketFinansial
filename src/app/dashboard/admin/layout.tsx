import type { ReactNode } from 'react';
import Header from '@/components/Dashboard/DashboardPage/Header';
import MainContent from '@/components/Dashboard/DashboardPage/MainContent';
import Sidebar from '@/components/Dashboard/DashboardPage/Sidebar';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

interface LayoutProps {
  children: ReactNode;
}

export default async function Layout({ children }: LayoutProps) {
  const session = await auth();

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'AUTHOR')) {
    redirect('/signin');
  }

  return (
    <div
      className="flex h-screen w-full bg-gray-50 dark:bg-gray-900 transition-colors duration-200"
      dir="rtl"
    >
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <MainContent>{children}</MainContent>
      </div>
    </div>
  );
}
