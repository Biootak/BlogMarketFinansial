import DashboardGate from './DashboardGate';
import './dashboard.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 2026-06-26: auth() and getSystemSettingsData() are uncached async
  // calls. Under `cacheComponents: true` they must be inside <Suspense>
  // so the dashboard shell can stream first. DashboardGate wraps both.
  return <DashboardGate>{children}</DashboardGate>;
}
