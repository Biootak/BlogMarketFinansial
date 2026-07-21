'use server';

/**
 * exchange-auth — helper مشترک برای بررسی دسترسی به صرافی
 *
 * قبلاً سه بار در exchange-customers.ts / exchange-quotes.ts / exchange-transactions.ts
 * تکرار شده بود. این فایل منبع حقیقت (single source of truth) است.
 *
 * منطق دسترسی:
 *   - OWNER / ADMIN پلتفرم → دسترسی کامل به همه صرافی‌ها
 *   - بقیه → باید staff فعال (revokedAt=null) همین exchangeId باشند
 *   - برای عملیات نوشتن (write=true) → role باید OWNER یا MANAGER باشد
 */

import prisma from '@/lib/db';
import { requireUser } from '@/lib/require-auth';

export type ExchangeAccessOk = { ok: true; userId: string };
export type ExchangeAccessFail = {
  ok: false;
  error: { success: false; status: 401 | 403; code: string; message: string };
};
export type ExchangeAccessResult = ExchangeAccessOk | ExchangeAccessFail;

/**
 * بررسی دسترسی کاربر به یک صرافی.
 *
 * @param exchangeId  شناسه صرافی
 * @param writeAccess اگر true باشد، role staff باید OWNER یا MANAGER باشد
 */
export async function requireExchangeAccess(
  exchangeId: string,
  writeAccess = false,
): Promise<ExchangeAccessResult> {
  const auth = await requireUser();
  if (!auth.success) {
    return {
      ok: false,
      error: { success: false, status: auth.status, code: auth.code, message: auth.message },
    };
  }

  const { user } = auth;

  // OWNER/ADMIN/SUPERADMIN پلتفرم همه صرافی‌ها را مدیریت می‌کنند
  // C4-fix: SUPERADMIN هم مثل OWNER/ADMIN bypass دارد
  if (user.role === 'OWNER' || user.role === 'ADMIN' || user.role === 'SUPERADMIN') {
    return { ok: true, userId: user.id };
  }

  const whereRole = writeAccess
    ? { role: { in: ['OWNER', 'MANAGER'] as ('OWNER' | 'MANAGER')[] } }
    : {};

  const staff = await prisma.exchangeStaff.findFirst({
    where: { exchangeId, userId: user.id, revokedAt: null, ...whereRole },
    select: { id: true },
  });

  if (!staff) {
    return {
      ok: false,
      error: {
        success: false,
        status: 403,
        code: 'FORBIDDEN',
        message: writeAccess
          ? 'فقط مدیران صرافی می‌توانند این عملیات را انجام دهند'
          : 'دسترسی به این صرافی ندارید',
      },
    };
  }

  return { ok: true, userId: user.id };
}
