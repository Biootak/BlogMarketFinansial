import { SessionGuard } from '@/components/Dashboard/SessionGuard';
import OfflineBanner from '@/components/OfflineBanner/OfflineBanner';
import DashboardGate from './DashboardGate';
import './dashboard.css';
import './dashboard-shell.css';
// atlas-primitives is the baseline skin for dash2-* primitives.
import './atlas-primitives.css';
// These are intentional final overrides: state and header behavior must win
// over both the legacy dashboard stylesheet and the Atlas baseline.
import './dashboard-header-overrides.css';
import './dashboard-sidebar-state.css';

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
