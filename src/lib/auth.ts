import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

export async function checkRole(allowedRoles: string[]) {
  const session = await auth();
  
  if (!session || !session.user) {
    redirect('/signin');
  }

  const hasRequiredRole = allowedRoles.includes(session.user.role);
  if (!hasRequiredRole) {
    redirect('/');
  }

  return session.user;
}

export async function checkSuperAdmin() {
  const session = await auth();
  
  if (!session || !session.user) {
    redirect('/signin');
  }

  if (session.user.role !== 'SUPER_ADMIN') {
    redirect('/');
  }

  return session.user;
}

export async function checkAdmin() {
  const session = await auth();
  
  if (!session || !session.user) {
    redirect('/signin');
  }

  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
    redirect('/');
  }

  return session.user;
}

export async function checkAuthor() {
  const session = await auth();
  
  if (!session || !session.user) {
    redirect('/signin');
  }

  if (!['AUTHOR', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
    redirect('/');
  }

  return session.user;
}

export async function checkExistingSuperAdmin(prisma: PrismaClient) {
  try {
    const existingAdmin = await prisma.user.findFirst({
      where: {
        role: Role.SUPER_ADMIN
      }
    });
    return existingAdmin;
  } catch (error) {
    console.error('Error checking super admin:', error);
    return null;
  }
}
