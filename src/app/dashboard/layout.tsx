import { SessionGuard } from '@/components/Dashboard/SessionGuard';
import OfflineBanner from '@/components/OfflineBanner/OfflineBanner';
import DashboardGate from './DashboardGate';
import './dashboard.css';
import './dashboard-shell.css';
import './dashboard-header-overrides.css';
// آخرین import عمدی است: atlas-primitives منبع حقیقت واحد کلاس‌های dash2-*
// است و باید بر قوانین قدیمی dashboard.css اولویت داشته باشد.
import './atlas-primitives.css';

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
