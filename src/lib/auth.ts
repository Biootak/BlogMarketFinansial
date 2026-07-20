import { auth } from '@/auth';
import { type PrismaClient as PrismaClientType, Role } from '@prisma/client';
import { redirect } from 'next/navigation';

export async function checkRole(allowedRoles: string[]) {
  const session = await auth();

  if (!session || !session.user) {
    redirect('/signin');
  }

  // OWNER has access to everything.
  if (session.user.role === 'OWNER') {
    return session;
  }

  const hasRequiredRole = allowedRoles.includes(session.user.role);
  if (!hasRequiredRole) {
    redirect('/');
  }

  return session;
}

export async function checkSuperAdmin() {
  const session = await auth();

  if (!session || !session.user) {
    redirect('/signin');
  }

  if (session.user.role !== 'OWNER') {
    redirect('/');
  }

  return session.user;
}

export async function checkAdmin() {
  const session = await auth();

  if (!session || !session.user) {
    redirect('/signin');
  }

  if (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
    redirect('/');
  }

  return session.user;
}

export async function checkAuthor() {
  const session = await auth();

  if (!session || !session.user) {
    redirect('/signin');
  }

  if (!['AUTHOR', 'ADMIN', 'OWNER'].includes(session.user.role)) {
    redirect('/');
  }

  return session.user;
}

export async function checkExistingSuperAdmin(prisma: PrismaClientType) {
  try {
    const existingAdmin = await prisma.user.findFirst({
      where: {
        role: Role.OWNER,
      },
    });
    return existingAdmin;
  } catch (error) {
    console.error('Error checking super admin:', error);
    return null;
  }
}
