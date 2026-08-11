'use server';

import { auth } from '@/auth';
import { Role } from '@prisma/client';

export async function checkReportAccess() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('لطفاً وارد سیستم شوید');
  }

  const userRole = session.user.role as string;
  // 2026-08-11: reports are owner-only — SUPERADMIN is an elevated ADMIN,
  // not an OWNER alias, and must not read financial reports.
  const allowed: string[] = [Role.OWNER];
  if (!allowed.includes(userRole)) {
    throw new Error('شما دسترسی لازم برای مشاهده گزارش‌ها را ندارید');
  }
}
