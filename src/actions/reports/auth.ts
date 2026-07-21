'use server';

import { auth } from '@/auth';
import { Role } from '@prisma/client';

export async function checkReportAccess() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('لطفاً وارد سیستم شوید');
  }

  const userRole = session.user.role as string;
  // SUPERADMIN هم باید دسترسی داشته باشد — با require-auth هماهنگ است
  const allowed: string[] = [Role.ADMIN, Role.OWNER, Role.SUPERADMIN];
  if (!allowed.includes(userRole)) {
    throw new Error('شما دسترسی لازم برای مشاهده گزارش‌ها را ندارید');
  }
}
