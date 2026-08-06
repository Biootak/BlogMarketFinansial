import { SessionGuard } from '@/components/Dashboard/SessionGuard';
import OfflineBanner from '@/components/OfflineBanner/OfflineBanner';
import DashboardGate from './DashboardGate';
import './dashboard.css';
import './dashboard-shell.css';
import './atlas-primitives.css';
import './dashboard-header-overrides.css';
import './dashboard-sidebar-state.css';
import './dashboard-atlas-surfaces.css';

export const dynamic = 'force-dynamic';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionGuard>
      <OfflineBanner />
      <DashboardGate>
        <div className="dashboard-shell" data-portal="admin">
          {children}
        </div>
      </DashboardGate>
    </SessionGuard>
  );
}
