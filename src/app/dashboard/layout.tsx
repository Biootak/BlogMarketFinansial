import { unstable_noStore } from 'next/cache';
import DashboardGate from './DashboardGate';
import './dashboard.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 2026-06-29: Force dynamic rendering for all dashboard routes.
  // With cacheComponents: true, we can't use `export const dynamic`,
  // so we call unstable_noStore() to opt out of static generation.
  // This prevents build-time database connection attempts.
  unstable_noStore();

  // 2026-06-26: auth() and getSystemSettingsData() are uncached async
  // calls. Under `cacheComponents: true` they must be inside <Suspense>
  // so the dashboard shell can stream first. DashboardGate wraps both.
  return <DashboardGate>{children}</DashboardGate>;
}
