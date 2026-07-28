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

/**
 * Portal discriminant — identifies which product area the shell is rendering.
 * Used by Header, KeyboardShortcuts and future portal-specific chrome to scope
 * behaviour without duplicating the entire DashboardProviders tree.
 *
 * 'admin'    → /dashboard/*   (OWNER / SUPERADMIN / ADMIN / SUPPORT / AUTHOR / USER)
 * 'customer' → /customer/*    (CUSTOMER / TEST_CUSTOMER / MERCHANT, + platform admins in read-only)
 * 'exchange' → /exchange/*    (EXCHANGE staff, + platform admins in owner view)
 */
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

/**
 * All roles that are valid for sidebar menu resolution.
 * TEST_CUSTOMER is included — it gets the CUSTOMER menu (not USER).
 */
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

/**
 * Platform admins (OWNER/SUPERADMIN/ADMIN) entering a customer or exchange
 * portal should see that portal's menu, not the admin menu.
 * This map normalises their role to the correct portal's representative role.
 */
const PLATFORM_ADMINS = new Set(['OWNER', 'SUPERADMIN', 'ADMIN']);

function resolvePortalRole(userRole: string, portal: PortalType): AllowedRole {
  // In customer / exchange portals, platform admins get the portal's native menu
  // so they don't see admin-only items (posts, users, KYC review, …) while
  // browsing a customer's data in a support context.
  if (portal === 'customer' && PLATFORM_ADMINS.has(userRole)) return 'CUSTOMER';
  if (portal === 'exchange' && PLATFORM_ADMINS.has(userRole)) return 'EXCHANGE';
  if (KNOWN_ROLES.has(userRole)) return userRole as AllowedRole;
  // Unknown / future roles fall back to the most restrictive meaningful role
  return 'USER';
}

interface DashboardProvidersProps {
  /** Raw role string from the NextAuth session — widened so callers need no cast. */
  userRole: string;
  /**
   * Which product portal this shell is rendering.
   * Defaults to 'admin' so existing /dashboard usage is unchanged.
   */
  portal?: PortalType;
  /**
   * Exchange-only: staff role within the exchange (OWNER/MANAGER/STAFF/VIEWER).
   * Controls which exchange menu items are visible.
   */
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
      <div
        className="dash-root flex h-screen overflow-hidden bg-[var(--nova-canvas)] transition-colors duration-300"
        dir="rtl"
      >
        <SidebarInitializer />
        {/* KeyboardShortcuts handles both universal (g t theme, g k search,
            g ? help, ⌘K palette) and admin-only (g d/p/s/r/c/a/l navigation)
            chords. It must run in every portal so theme toggle and search
            focus are available everywhere; the admin-only subset is gated
            internally by the `portal` prop. */}
        <KeyboardShortcuts portal={portal} />
        <Sidebar userRole={sidebarRole} staffRole={staffRole} />
        <SidebarToggle />
        <BreadcrumbProvider>
          <div className="flex flex-col flex-1 overflow-hidden">
            <Header portal={portal} />
            <MainContent>{children}</MainContent>
          </div>
        </BreadcrumbProvider>
        <Toaster />
      </div>
    </DirectionProvider>
  );
}
