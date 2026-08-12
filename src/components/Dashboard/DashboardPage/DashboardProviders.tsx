'use client';

import { BreadcrumbProvider } from '@/components/Dashboard/DashboardPage/BreadcrumbContext';
import Header from '@/components/Dashboard/DashboardPage/Header';
import { KeyboardShortcuts } from '@/components/Dashboard/DashboardPage/KeyboardShortcuts';
import MainContent from '@/components/Dashboard/DashboardPage/MainContent';
import Sidebar from '@/components/Dashboard/DashboardPage/Sidebar';
import SidebarInitializer from '@/components/Dashboard/DashboardPage/SidebarInitializer';
import SidebarToggle from '@/components/Dashboard/DashboardPage/SidebarToggle';
import { DensityProvider } from '@/components/Dashboard/primitives';
import { Toaster } from '@/components/ui/toaster';
import { DirectionProvider } from '@radix-ui/react-direction';
import type { ReactNode } from 'react';

export type PortalType = 'admin' | 'customer' | 'exchange';
export type AllowedRole =
  | 'USER'
  | 'AUTHOR'
  | 'SUPPORT'
  | 'ADMIN'
  | 'OWNER'
  | 'SUPERADMIN'
  | 'CUSTOMER'
  | 'TEST_CUSTOMER'
  | 'MERCHANT'
  | 'EXCHANGE';

const KNOWN_ROLES = new Set<string>([
  'USER',
  'AUTHOR',
  'SUPPORT',
  'ADMIN',
  'OWNER',
  'SUPERADMIN',
  'CUSTOMER',
  'TEST_CUSTOMER',
  'MERCHANT',
  'EXCHANGE',
]);
const PLATFORM_ADMINS = new Set(['OWNER', 'SUPERADMIN', 'ADMIN']);

function resolvePortalRole(userRole: string, portal: PortalType): AllowedRole {
  if (portal === 'customer' && PLATFORM_ADMINS.has(userRole)) return 'CUSTOMER';
  if (portal === 'exchange' && PLATFORM_ADMINS.has(userRole)) return 'EXCHANGE';
  if (KNOWN_ROLES.has(userRole)) return userRole as AllowedRole;
  return 'USER';
}

interface DashboardProvidersProps {
  userRole: string;
  portal?: PortalType;
  staffRole?: string;
  children: ReactNode;
}

export function DashboardProviders({
  userRole,
  portal = 'admin',
  staffRole,
  children,
}: DashboardProvidersProps) {
  const sidebarRole = resolvePortalRole(userRole, portal);

  return (
    <DirectionProvider dir="rtl">
      <DensityProvider>
        <div className="dash-root" data-portal={portal} dir="rtl">
          <SidebarInitializer />
          <KeyboardShortcuts portal={portal} />
          <Sidebar userRole={sidebarRole} staffRole={staffRole} />
          <SidebarToggle />
          <BreadcrumbProvider>
            <div className="dashboard-shell__viewport">
              <Header portal={portal} />
              <MainContent>{children}</MainContent>
            </div>
          </BreadcrumbProvider>
          <Toaster />
        </div>
      </DensityProvider>
    </DirectionProvider>
  );
}
