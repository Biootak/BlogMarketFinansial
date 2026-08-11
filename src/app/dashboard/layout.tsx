import { auth } from '@/auth';
import UniversalCommandPalette from '@/components/Dashboard/DashboardPage/UniversalCommandPalette';
import { SessionGuard } from '@/components/Dashboard/SessionGuard';
import OfflineBanner from '@/components/OfflineBanner/OfflineBanner';
import DashboardGate from './DashboardGate';
import './dashboard.css';
import './dashboard-shell.css';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role as 'OWNER' | 'SUPERADMIN' | 'ADMIN' | 'AUTHOR' | undefined;

  return (
    <SessionGuard>
      <OfflineBanner />
      <DashboardGate>
        <div className="dashboard-shell" data-portal="admin">
          {children}
        </div>
        {role && <UniversalCommandPalette portal="admin" role={role} />}
      </DashboardGate>
    </SessionGuard>
  );
}
