import { auth } from "@/auth";
import { redirect } from "next/navigation";

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
