'use server';

import { auth } from '@/auth';
import { Role } from '@prisma/client';

export async function checkReportAccess() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('لطفاً وارد سیستم شوید');
  }

  const userRole = session.user.role as 'ADMIN' | 'SUPER_ADMIN';
  if (![Role.ADMIN, Role.SUPER_ADMIN].includes(userRole)) {
    throw new Error('شما دسترسی لازم برای مشاهده گزارش‌ها را ندارید');
  }
}
