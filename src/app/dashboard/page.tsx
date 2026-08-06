import { auth } from '@/auth';
import { redirect } from 'next/navigation';

import prisma from '@/lib/db';
import { FintechCockpitServer } from '@/components/Dashboard/DashboardPage/FintechCockpitServer';
import { UserHome } from '@/components/Dashboard/DashboardPage/UserHome';

/**
 * Dashboard home is intentionally a single decision surface.
 * The previous home requested a second editorial dashboard stack after the
 * cockpit, which duplicated visual hierarchy and added needless DB reads.
 * Editorial analytics remain available on their dedicated routes.
 */
export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) redirect('/auth?callbackUrl=/dashboard');

  if (session.user.role === 'USER' || session.user.role === 'SUPPORT') {
    const dbUser = await prisma.user
      .findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          createdAt: true,
          role: true,
        },
      })
      .catch(() => null);

    if (!dbUser) redirect('/auth?callbackUrl=/dashboard');

    const accountAgeDays = dbUser.createdAt
      ? Math.floor((Date.now() - new Date(dbUser.createdAt).getTime()) / 86_400_000)
      : 999;

    return (
      <UserHome
        userId={dbUser.id}
        userName={dbUser.name ?? session.user.name ?? ''}
        userEmail={dbUser.email}
        emailVerified={!!dbUser.emailVerified}
        accountAgeDays={accountAgeDays}
        role={dbUser.role}
      />
    );
  }

  const allowedRoles = new Set(['OWNER', 'ADMIN', 'AUTHOR', 'SUPERADMIN']);
  if (!allowedRoles.has(session.user.role ?? '')) redirect('/');

  return <FintechCockpitServer />;
}
