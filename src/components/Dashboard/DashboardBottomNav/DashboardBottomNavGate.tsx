import { auth } from '@/auth';
import prisma from '@/lib/db';
import DashboardBottomNav from './DashboardBottomNav';

/**
 * DashboardBottomNavGate — Server Component.
 *
 * Resolves auth + unread-notification count on the server, then hands the
 * data to the client-only bottom nav. No flicker on first paint.
 */
const DashboardBottomNavGate = async () => {
  const session = await auth();
  if (!session?.user?.id) return null;

  let unread = 0;
  let kycVerified = true;
  try {
    // 2026-07-29: Notification model may not have isRead; guarded with .catch
    // so the dashboard renders even if the schema needs migration.
    const row = await prisma.notification
      .count({
        where: { userId: session.user.id, isRead: false },
      })
      .catch(() => 0);
    unread = typeof row === 'number' ? row : 0;
  } catch {
    unread = 0;
  }

  // USER/SUPPORT: اگر Customer record با KYC APPROVED ندارند → primary=KYC
  const role = session.user.role as string;
  if (role === 'USER' || role === 'SUPPORT' || !role) {
    try {
      const customer = await prisma.customer.findFirst({
        where: { userId: session.user.id },
        select: { kycStatus: true },
      });
      kycVerified = customer?.kycStatus === 'APPROVED';
    } catch {
      kycVerified = false;
    }
  }

  return (
    <DashboardBottomNav
      role={role}
      unreadCount={unread}
      kycVerified={kycVerified}
    />
  );
};

export default DashboardBottomNavGate;
