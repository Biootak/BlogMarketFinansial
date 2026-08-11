import { auth } from '@/auth';
import UniversalCommandPalette from '@/components/Dashboard/DashboardPage/UniversalCommandPalette';
import { SessionGuard } from '@/components/Dashboard/SessionGuard';
import OfflineBanner from '@/components/OfflineBanner/OfflineBanner';
import prisma from '@/lib/db';
import { redirect } from 'next/navigation';
import DashboardGate from './DashboardGate';
import './dashboard.css';
import './dashboard-shell.css';

export const dynamic = 'force-dynamic';

const OWNER_ROLES = new Set(['OWNER', 'SUPERADMIN']);

/**
 * 2FA اجباری و دائمی برای حساب مالک (OWNER/SUPERADMIN).
 * بدون فعال‌سازی 2FA هیچ صفحه‌ای از داشبورد باز نمی‌شود — کاربر به
 * /2fa-setup هدایت می‌شود تا همین‌جا فعال‌سازی را کامل کند. آن صفحه خارج
 * از درخت /dashboard است (تحت gate نیست) — بنابراین اینجا loop نمی‌شود.
 */
async function enforceOwnerTwoFactor(userId: string, role: string): Promise<void> {
  if (!OWNER_ROLES.has(role)) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true },
  });
  if (user?.twoFactorEnabled) return;
  redirect('/2fa-setup');
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role as 'OWNER' | 'SUPERADMIN' | 'ADMIN' | 'AUTHOR' | undefined;

  if (session?.user?.id && role) {
    await enforceOwnerTwoFactor(session.user.id, role);
  }

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
