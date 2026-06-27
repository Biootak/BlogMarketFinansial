'use client';

import type { ReactNode } from 'react';
import { DirectionProvider } from '@radix-ui/react-direction';
import { Toaster } from '@/components/ui/toaster';
import { KeyboardShortcuts } from '@/components/Dashboard/DashboardPage/KeyboardShortcuts';
import Sidebar from '@/components/Dashboard/DashboardPage/Sidebar';
import SidebarInitializer from '@/components/Dashboard/DashboardPage/SidebarInitializer';
import Header from '@/components/Dashboard/DashboardPage/Header';
import MainContent from '@/components/Dashboard/DashboardPage/MainContent';
import { BreadcrumbProvider } from '@/components/Dashboard/DashboardPage/BreadcrumbContext';

interface DashboardProvidersProps {
  userRole: 'USER' | 'AUTHOR' | 'ADMIN' | 'SUPER_ADMIN';
  children: ReactNode;
}

export function DashboardProviders({ userRole, children }: DashboardProvidersProps) {
  return (
    <DirectionProvider dir="rtl">
      <div
        className="flex h-screen overflow-hidden bg-gradient-to-br from-[#f3f4f6] via-[#eef2f6] to-[#e0e7ff] dark:bg-gradient-to-br dark:from-[#090d16] dark:via-[#0f172a] dark:to-[#0b0f19] transition-colors duration-300"
        dir="rtl"
      >
        <SidebarInitializer />
        <KeyboardShortcuts />
        <Sidebar userRole={userRole} />
        <BreadcrumbProvider>
          <div className="flex flex-col flex-1 overflow-hidden">
            <Header />
            <MainContent>{children}</MainContent>
          </div>
        </BreadcrumbProvider>
        <Toaster />
      </div>
    </DirectionProvider>
  );
}
