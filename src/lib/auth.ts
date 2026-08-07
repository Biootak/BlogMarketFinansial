import { auth } from '@/auth';
import { type PrismaClient as PrismaClientType, Role } from '@prisma/client';
import { redirect } from 'next/navigation';

export async function checkRole(allowedRoles: string[]) {
  const session = await auth();

  if (!session || !session.user) {
    redirect('/auth');
  }

  // OWNER and SUPERADMIN have access to everything.
  if (session.user.role === 'OWNER' || session.user.role === 'SUPERADMIN') {
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
    redirect('/auth');
  }

  // G8-fix: SUPERADMIN alias برای OWNER — مطابق require-auth.ts و RBAC matrix
  if (session.user.role !== 'OWNER' && session.user.role !== 'SUPERADMIN') {
    redirect('/');
  }

  return session.user;
}

export async function checkAdmin() {
  const session = await auth();

  if (!session || !session.user) {
    redirect('/auth');
  }

  // G8-fix: SUPERADMIN هم مثل OWNER/ADMIN دسترسی ادمین دارد
  if (!['ADMIN', 'OWNER', 'SUPERADMIN'].includes(session.user.role)) {
    redirect('/');
  }

  return session.user;
}

export async function checkAuthor() {
  const session = await auth();

  if (!session || !session.user) {
    redirect('/auth');
  }

  // G8-fix: SUPERADMIN هم باید به محتوا دسترسی داشته باشد
  if (!['AUTHOR', 'ADMIN', 'OWNER', 'SUPERADMIN'].includes(session.user.role)) {
    redirect('/');
  }

  return session.user;
}

/**
 * `null` فقط یعنی «هیچ OWNER وجود ندارد».
 * خطای دیتابیس propagate می‌شود تا caller بتواند «نمی‌دانم» را از «وجود ندارد»
 * تشخیص دهد — بلعیدن خطا اینجا یعنی صفحهٔ setup روی DB خراب طوری رفتار می‌کرد
 * که انگار سیستم هنوز راه‌اندازی نشده است.
 */
export async function checkExistingSuperAdmin(prisma: PrismaClientType) {
  return prisma.user.findFirst({
    where: {
      role: Role.OWNER,
    },
  });
}
