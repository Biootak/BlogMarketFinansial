'use server';

/**
 * customer-auth — helper برای بررسی دسترسی به پورتال مشتری
 *
 * منطق دسترسی:
 *   OWNER / SUPERADMIN / ADMIN پلتفرم → دسترسی کامل (برای پشتیبانی)
 *   CUSTOMER / TEST_CUSTOMER / MERCHANT → اگر Customer record داشته باشند دسترسی دارند
 *   بقیه → 403 FORBIDDEN
 */

import { cookies, headers } from 'next/headers';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/require-auth';

const PLATFORM_ADMINS = new Set(['OWNER', 'SUPERADMIN', 'ADMIN']);
const CUSTOMER_ROLES = new Set(['CUSTOMER', 'TEST_CUSTOMER', 'MERCHANT']);
const ADMIN_CUSTOMER_COOKIE = 'admin_customer_ctx';
const ADMIN_CUSTOMER_HEADER = 'x-customer-ctx';

/**
 * ادمین‌ها می‌توانند customer context را از این منابع resolve کنند (به ترتیب اولویت):
 *  1. Header `x-customer-ctx` (برای middleware/route handlers)
 *  2. Cookie `admin_customer_ctx` (برای navigation در پنل ادمین)
 *  3. Query param `?customerId=` (برای deep link از /dashboard/customers)
 *
 * اگر هیچ‌کدام نبود → null (یعنی: اولین مشتری فعال).
 */
async function getRequestedCustomerId(): Promise<string | null> {
  try {
    // 1) Header (برای middleware)
    const h = await headers();
    const fromHeader = h.get(ADMIN_CUSTOMER_HEADER);
    if (fromHeader && fromHeader.length > 0) return fromHeader;

    // 2) Cookie
    const c = await cookies();
    const fromCookie = c.get(ADMIN_CUSTOMER_COOKIE)?.value;
    if (fromCookie && fromCookie.length > 0) return fromCookie;
  } catch {
    // در بعضی contexts (route handler بیرون از request scope) ممکن است throw کند
  }
  return null;
}

export type CustomerAccessOk = {
  ok: true;
  userId: string;
  customerId: string;
  exchangeId: string;
  /** وضعیت Customer record (ACTIVE / FROZEN / CLOSED / PENDING) — برای تصمیم‌گیری UI */
  customerStatus: string;
};

export type CustomerAccessFail = {
  ok: false;
  error: { success: false; status: 401 | 403 | 404; code: string; message: string };
};

export type CustomerAccessResult = CustomerAccessOk | CustomerAccessFail;

/**
 * بررسی دسترسی کاربر به پورتال مشتری.
 * OWNER/ADMIN پلتفرم به اولین Customer record مشتری دسترسی دارند.
 */
export async function requireCustomerAccess(): Promise<CustomerAccessResult> {
  const auth = await requireUser();
  if (!auth.success) {
    return {
      ok: false,
      error: {
        success: false,
        status: auth.status,
        code: auth.code,
        message: auth.message,
      },
    };
  }

  const { user } = auth;

  if (PLATFORM_ADMINS.has(user.role as string)) {
    // ادمین پلتفرم: می‌تواند با ?customerId=X یک مشتری خاص را انتخاب کند
    // (برای پشتیبانی). در غیر این صورت اولین Customer record فعال.
    const requestedId = await getRequestedCustomerId();
    const where = requestedId
      ? { id: requestedId, status: { not: 'CLOSED' as const } }
      : { status: { not: 'CLOSED' as const } };

    const customer = await prisma.customer.findFirst({
      where,
      orderBy: { createdAt: 'asc' },
      select: { id: true, exchangeId: true, status: true },
    });
    if (!customer) {
      return {
        ok: false,
        error: {
          success: false,
          status: 404,
          code: requestedId ? 'CUSTOMER_NOT_FOUND' : 'NO_CUSTOMER_FOUND',
          message: requestedId
            ? 'مشتری انتخاب‌شده یافت نشد یا بسته شده است'
            : 'هیچ مشتری‌ای در سیستم ثبت نشده',
        },
      };
    }
    return {
      ok: true,
      userId: user.id,
      customerId: customer.id,
      exchangeId: customer.exchangeId,
      customerStatus: customer.status,
    };
  }

  if (!CUSTOMER_ROLES.has(user.role as string)) {
    return {
      ok: false,
      error: {
        success: false,
        status: 403,
        code: 'FORBIDDEN',
        message: 'دسترسی به پورتال مشتری ندارید',
      },
    };
  }

  // کاربر با نقش CUSTOMER — Customer record خود را پیدا می‌کند
  const customer = await prisma.customer.findFirst({
    where: { userId: user.id, status: { not: 'CLOSED' } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, exchangeId: true, status: true },
  });

  if (!customer) {
    return {
      ok: false,
      error: {
        success: false,
        status: 403,
        code: 'NO_CUSTOMER_PROFILE',
        message: 'پروفایل مشتری برای حساب شما یافت نشد. با پشتیبانی تماس بگیرید',
      },
    };
  }

  return {
    ok: true,
    userId: user.id,
    customerId: customer.id,
    exchangeId: customer.exchangeId,
    customerStatus: customer.status,
  };
}

/**
 * تنظیم customer context برای ادمین پلتفرم (از طریق cookie).
 * وقتی ادمین می‌خواهد پشتیبانی یک مشتری خاص را بر عهده بگیرد.
 * موفق: cookie ست می‌شود. ناموفق: خطا برمی‌گردد.
 */
export async function setAdminCustomerContext(
  customerId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: auth.message };
  }
  if (!PLATFORM_ADMINS.has(auth.user.role as string)) {
    return { success: false, error: 'فقط ادمین‌های پلتفرم می‌توانند customer context را تغییر دهند' };
  }
  if (!customerId || typeof customerId !== 'string' || customerId.length < 8) {
    return { success: false, error: 'شناسه مشتری نامعتبر است' };
  }

  const exists = await prisma.customer.findFirst({
    where: { id: customerId, status: { not: 'CLOSED' } },
    select: { id: true },
  });
  if (!exists) {
    return { success: false, error: 'مشتری یافت نشد یا بسته شده است' };
  }

  const c = await cookies();
  c.set(ADMIN_CUSTOMER_COOKIE, customerId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 ساعت
  });
  return { success: true };
}

/**
 * پاک کردن customer context (بازگشت به پیش‌فرض: اولین مشتری فعال).
 */
export async function clearAdminCustomerContext(): Promise<{ success: true }> {
  const c = await cookies();
  c.delete(ADMIN_CUSTOMER_COOKIE);
  return { success: true };
}

/**
 * لیست مشتریان فعال برای ادمین (برای customer switcher).
 * فقط پلتفرم ادمین‌ها می‌توانند ببینند.
 */
export async function listCustomersForAdmin(
  search?: string,
): Promise<Array<{ id: string; fullName: string; phone: string; exchangeName: string; city: string | null }>> {
  const auth = await requireUser();
  if (!auth.success) return [];
  if (!PLATFORM_ADMINS.has(auth.user.role as string)) return [];

  const where = search && search.length >= 2
    ? {
        status: { not: 'CLOSED' as const },
        OR: [
          { fullName: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search } },
        ],
      }
    : { status: { not: 'CLOSED' as const } };

  const rows = await prisma.customer.findMany({
    where,
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fullName: true,
      phone: true,
      city: true,
      Exchange: { select: { name: true, displayName: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    phone: r.phone,
    city: r.city,
    exchangeName: r.Exchange.displayName ?? r.Exchange.name,
  }));
}
