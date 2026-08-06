'use client';

/**
 * RouteFrame — structural wrapper for dashboard routes.
 *
 * Page titles belong to PageHeader (or to the route's own hero). RouteFrame
 * used to inject a second utility/header block around every page, which made
 * the new dashboard home show "مرکز فرمان" above its real greeting and put
 * every other route at risk of rendering two headers. Keep this component
 * intentionally structural: route metadata is exposed for styling/debugging,
 * while visible page context stays with the page that owns it.
 */

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export function RouteFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="route-frame" data-route-path={pathname}>
      {children}
    </div>
  );
}
