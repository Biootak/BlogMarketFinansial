import { SessionGuard } from '@/components/Dashboard/SessionGuard';
import OfflineBanner from '@/components/OfflineBanner/OfflineBanner';
import DashboardGate from './DashboardGate';
import './dashboard.css';
// ترتیب ایمپورت عمدی است و بخشی از معماری:
//   dashboard.css       — میراث (۴۴۴KB، دست‌نخورده، در حال بازنشستگی)
//   dashboard-shell.css — Atlas: چیدمان و پوسته
//   atlas-primitives.css — Atlas: ظاهر اجزای مشترک
// لایه‌های بعدی روی لایه‌های قبلی می‌نشینند؛ هیچ !important جدیدی لازم نیست.
import './dashboard-shell.css';
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
