import DashboardGate from './DashboardGate';
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
  return <DashboardGate>{children}</DashboardGate>;
}
