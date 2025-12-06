/**
 * Safe Data Fetching Utilities
 * برای مدیریت خطاها در Server Components و جلوگیری از crash کردن صفحه
 */

import { Prisma } from '@prisma/client';

export interface SafeResult<T> {
  data: T | null;
  error: string | null;
  isError: boolean;
}

/**
 * Wrapper برای data fetching که خطاها رو catch میکنه
 * و به جای throw کردن، یک object برمیگردونه
 */
export async function safeFetch<T>(
  fetcher: () => Promise<T>,
  fallback: T | null = null,
): Promise<SafeResult<T>> {
  try {
    const data = await fetcher();
    return { data, error: null, isError: false };
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    // فقط در development لاگ کن
    if (process.env.NODE_ENV === 'development') {
      console.error('[SafeFetch Error]:', errorMessage);
    }

    return { data: fallback, error: errorMessage, isError: true };
  }
}

/**
 * تبدیل خطا به پیام فارسی مناسب برای کاربر
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P1001':
        return 'اتصال به سرور برقرار نشد. لطفاً دوباره تلاش کنید.';
      case 'P1002':
        return 'زمان اتصال به سرور به پایان رسید.';
      case 'P2002':
        return 'این اطلاعات قبلاً ثبت شده است.';
      case 'P2025':
        return 'اطلاعات مورد نظر یافت نشد.';
      default:
        return 'خطا در دریافت اطلاعات.';
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return 'اتصال به پایگاه داده برقرار نشد.';
  }

  if (error instanceof Error) {
    // پیام‌های خاص
    if (error.message.includes('fetch')) {
      return 'خطا در برقراری ارتباط با سرور.';
    }
    if (error.message.includes('timeout')) {
      return 'زمان درخواست به پایان رسید.';
    }
    if (error.message.includes('network')) {
      return 'خطای شبکه. اتصال اینترنت را بررسی کنید.';
    }
  }

  return 'خطایی رخ داده است. لطفاً دوباره تلاش کنید.';
}

/**
 * تبدیل خطای Prisma به کد خطا
 */
export function getPrismaErrorCode(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code;
  }
  return null;
}

/**
 * چک کردن اینکه آیا خطا مربوط به اتصال دیتابیس هست
 */
export function isDatabaseConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ['P1001', 'P1002', 'P1003', 'P1008', 'P1017'].includes(error.code);
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  return false;
}
