/**
 * api/admin-guard — گارد مشترک نقش‌های داشبورد برای route handler ها.
 * پاسخ ۴۰۱/۴۰۳ را می‌سازد تا هر route فقط `if (denied) return denied;` بنویسد.
 */
import { auth } from '@/auth';
import type { NextResponse } from 'next/server';
import { apiError } from './response';

const ADMIN_ROLES = ['OWNER', 'SUPERADMIN', 'ADMIN'];

/** در صورت نداشتن دسترسی پاسخ آماده برمی‌گرداند؛ در غیر این صورت `null`. */
export async function denyUnlessAdmin(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 'احراز هویت نشده‌اید', 401);
  }
  if (!ADMIN_ROLES.includes(session.user.role ?? '')) {
    return apiError('FORBIDDEN', 'دسترسی ندارید', 403);
  }
  return null;
}
