'use client';

import type { ReactNode } from 'react';
import { DirectionProvider } from '@radix-ui/react-direction';
import { Toaster } from '@/components/ui/toaster';
import { KeyboardShortcuts } from '@/components/Dashboard/DashboardPage/KeyboardShortcuts';
import Sidebar from '@/components/Dashboard/DashboardPage/Sidebar';
import SidebarToggle from '@/components/Dashboard/DashboardPage/SidebarToggle';
import SidebarInitializer from '@/components/Dashboard/DashboardPage/SidebarInitializer';
import Header from '@/components/Dashboard/DashboardPage/Header';
import MainContent from '@/components/Dashboard/DashboardPage/MainContent';
import { BreadcrumbProvider } from '@/components/Dashboard/DashboardPage/BreadcrumbContext';

interface DashboardProvidersProps {
  userRole: 'USER' | 'AUTHOR' | 'SUPPORT' | 'ADMIN' | 'OWNER';
  children: ReactNode;
}

export function DashboardProviders({ userRole, children }: DashboardProvidersProps) {
  return (
    <DirectionProvider dir="rtl">
      <div
        className="dash-root flex h-screen overflow-hidden bg-[var(--nova-canvas)] transition-colors duration-300"
        dir="rtl"
      >
        <SidebarInitializer />
        <KeyboardShortcuts />
        <Sidebar userRole={userRole} />
        <SidebarToggle />
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
