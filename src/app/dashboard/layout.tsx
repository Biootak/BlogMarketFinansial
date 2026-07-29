import DashboardGate from './DashboardGate';
import { SessionGuard } from '@/components/Dashboard/SessionGuard';
import OfflineBanner from '@/components/OfflineBanner/OfflineBanner';
import './dashboard.css';

// 2026-06-29: Dashboard is auth-gated and user-specific — never statically
// generated. With `cacheComponents: false`, `export const dynamic` cascades
// to all dashboard routes, opting them out of build-time prerender (and the
// DB connection attempts that come with it).
export const dynamic = 'force-dynamic';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // auth() and getSystemSettingsData() are uncached async calls wrapped by
  // DashboardGate inside <Suspense> so the dashboard shell streams first.
  return (
    <SessionGuard>
      {/* R16-fix (2026-07-29): هشدار sticky آفلاین بالای داشبورد */}
      <OfflineBanner />
      <DashboardGate>{children}</DashboardGate>
    </SessionGuard>
  );
}
