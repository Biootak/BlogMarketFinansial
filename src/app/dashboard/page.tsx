import { auth } from '@/auth';
import { redirect } from 'next/navigation';

import prisma from '@/lib/db';
import { FintechCockpitServer } from '@/components/Dashboard/DashboardPage/FintechCockpitServer';
import { UserHome } from '@/components/Dashboard/DashboardPage/UserHome';
import { DashboardCommandSurface } from '@/components/Dashboard/primitives';

/** One focused landing surface. Editorial analytics keep their dedicated routes. */
export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) redirect('/auth?callbackUrl=/dashboard');

  const role = session.user.role ?? 'USER';
  const displayName = session.user.name ?? session.user.email ?? '';

  if (role === 'USER' || role === 'SUPPORT') {
    const dbUser = await prisma.user
      .findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, email: true, emailVerified: true, createdAt: true, role: true },
      })
      .catch(() => null);

    if (!dbUser) redirect('/auth?callbackUrl=/dashboard');

    const accountAgeDays = dbUser.createdAt
      ? Math.floor((Date.now() - new Date(dbUser.createdAt).getTime()) / 86_400_000)
      : 999;

    return (
      <DashboardCommandSurface portal="admin" userName={dbUser.name ?? displayName} role={role}>
        <UserHome
          userId={dbUser.id}
          userName={dbUser.name ?? displayName}
          userEmail={dbUser.email}
          emailVerified={!!dbUser.emailVerified}
          accountAgeDays={accountAgeDays}
          role={dbUser.role}
        />
      </DashboardCommandSurface>
    );
  }

  const allowedRoles = new Set(['OWNER', 'ADMIN', 'AUTHOR', 'SUPERADMIN']);
  if (!allowedRoles.has(role)) redirect('/');

  return (
    <DashboardCommandSurface portal="admin" userName={displayName} role={role}>
      <FintechCockpitServer />
    </DashboardCommandSurface>
  );
}
