/**
 * server-logger — 2026-08-11
 * --------------------------------------------------------------------------
 * Logger یکپارچه برای server-side که:
 *   - در production: خطا را به Sentry ارسال می‌کند (بدون console.error)
 *   - در development: در console لاگ می‌کند با context کامل
 *
 * جایگزین `console.error` در Server Actions / API routes / lib.
 *
 * استفاده:
 *   import { serverLog } from '@/lib/server-logger';
 *   serverLog.error('auth-actions', 'logout', error);
 *   serverLog.warn('currency-patterns', 'fetch retry', { attempt: 3 });
 * --------------------------------------------------------------------------
 */

import * as Sentry from '@sentry/nextjs';

const isDev = process.env.NODE_ENV === 'development';

type LogContext = Record<string, unknown> | Error | unknown;

function toSentryExtra(context: LogContext): Record<string, unknown> {
  if (context instanceof Error) return { message: context.message, stack: context.stack };
  if (typeof context === 'object' && context !== null) return context as Record<string, unknown>;
  return { value: context };
}

export const serverLog = {
  /**
   * خطاهای unexpected / internal — به Sentry ارسال می‌شود.
   * @param module نام ماژول مثل 'auth-actions'
   * @param action نام عملیات مثل 'logout'
   * @param error خطا یا context
   */
  error(module: string, action: string, error: unknown): void {
    const tag = `[${module}] ${action}`;

    if (isDev) {
      console.error(tag, error);
      return;
    }

    // Production: Sentry + no console leak
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: { module, action },
      extra: toSentryExtra(error),
    });
  },

  /**
   * هشدارهای غیر-بحرانی — فقط در development نمایش داده می‌شوند.
   * @param module نام ماژول
   * @param message پیام
   * @param context اطلاعات اضافه
   */
  warn(module: string, message: string, context?: LogContext): void {
    if (!isDev) return;
    console.warn(`[${module}] ${message}`, context ?? '');
  },
};
