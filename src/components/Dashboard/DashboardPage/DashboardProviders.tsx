'use client';

import { BreadcrumbProvider } from '@/components/Dashboard/DashboardPage/BreadcrumbContext';
import Header from '@/components/Dashboard/DashboardPage/Header';
import { KeyboardShortcuts } from '@/components/Dashboard/DashboardPage/KeyboardShortcuts';
import MainContent from '@/components/Dashboard/DashboardPage/MainContent';
import Sidebar from '@/components/Dashboard/DashboardPage/Sidebar';
import SidebarInitializer from '@/components/Dashboard/DashboardPage/SidebarInitializer';
import SidebarToggle from '@/components/Dashboard/DashboardPage/SidebarToggle';
import { Toaster } from '@/components/ui/toaster';
import { DirectionProvider } from '@radix-ui/react-direction';
import type { ReactNode } from 'react';

type AllowedRole = 'USER' | 'AUTHOR' | 'SUPPORT' | 'ADMIN' | 'OWNER' | 'SUPERADMIN';

const KNOWN_ROLES = new Set<string>(['USER', 'AUTHOR', 'SUPPORT', 'ADMIN', 'OWNER', 'SUPERADMIN']);

interface DashboardProvidersProps {
  // accepts any string from NextAuth session; narrows to AllowedRole internally
  userRole: string;
  children: ReactNode;
}

export function DashboardProviders({ userRole, children }: DashboardProvidersProps) {
  // Roles added for exchange/fintech features fall back to USER in the dashboard sidebar
  const sidebarRole: AllowedRole = KNOWN_ROLES.has(userRole) ? (userRole as AllowedRole) : 'USER';
  return (
    <DirectionProvider dir="rtl">
      <div
        className="dash-root flex h-screen overflow-hidden bg-[var(--nova-canvas)] transition-colors duration-300"
        dir="rtl"
      >
        <SidebarInitializer />
        <KeyboardShortcuts />
        <Sidebar userRole={sidebarRole} />
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
