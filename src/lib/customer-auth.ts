'use server';

/**
 * customer-auth — helper برای بررسی دسترسی به پورتال مشتری
 *
 * منطق دسترسی:
 *   OWNER / SUPERADMIN / ADMIN پلتفرم → دسترسی کامل (برای پشتیبانی)
 *   CUSTOMER / TEST_CUSTOMER / MERCHANT → اگر Customer record داشته باشند دسترسی دارند
 *   بقیه → 403 FORBIDDEN
 */

import prisma from '@/lib/db';
import { requireUser } from '@/lib/require-auth';

const PLATFORM_ADMINS = new Set(['OWNER', 'SUPERADMIN', 'ADMIN']);
const CUSTOMER_ROLES = new Set(['CUSTOMER', 'TEST_CUSTOMER', 'MERCHANT']);

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
  error: { success: false; status: 401 | 403; code: string; message: string };
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
    // ادمین پلتفرم: اولین Customer record فعال را پیدا کن
    const customer = await prisma.customer.findFirst({
      where: { status: { not: 'CLOSED' } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, exchangeId: true, status: true },
    });
    if (!customer) {
      return {
        ok: false,
        error: {
          success: false,
          status: 403,
          code: 'NO_CUSTOMER_FOUND',
          message: 'هیچ مشتری‌ای در سیستم ثبت نشده',
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
