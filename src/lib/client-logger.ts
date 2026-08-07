/**
 * client-logger — قرینهٔ سمت-کلاینت `server-logger`.
 *
 * پیش از این، خطاهای سمت کلاینت در بلوک‌های `catch {}` خالی گم می‌شدند:
 * شکست autosave ادیتور، شکست ثبت بازدید، شکست کپی در clipboard — هیچ‌کدام
 * جایی ثبت نمی‌شد، پس هیچ‌وقت دیده نمی‌شد. این ماژول یک مسیر واحد می‌دهد:
 *
 *   - در development به console (تنها جای مجاز console در کد کلاینت)
 *   - در production به Sentry (که از قبل در `sentry.client.config.ts` راه‌اندازی شده)
 *
 * هرگز throw نمی‌کند؛ خودِ لاگر نباید مسیر کاربر را بشکند.
 */

'use client';

import * as Sentry from '@sentry/nextjs';

const isDev = process.env.NODE_ENV === 'development';

type LogContext = Record<string, unknown> | Error | unknown;

function toExtra(module: string, action: string, context: LogContext): Record<string, unknown> {
  if (context instanceof Error) return { module, action, message: context.message };
  if (typeof context === 'object' && context !== null)
    return { module, action, ...(context as Record<string, unknown>) };
  return { module, action, value: context };
}

export const clientLog = {
  /** خطای غیرمنتظره در کلاینت. */
  error(module: string, action: string, error: unknown): void {
    if (isDev) {
      // biome-ignore lint/suspicious/noConsole: dev-only client diagnostics
      console.error(`[${module}] ${action}`, error);
      return;
    }
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: { module, action, side: 'client' },
      extra: toExtra(module, action, error),
    });
  },

  /** شکست غیر-بحرانی که کاربر مسدود نمی‌شود ولی باید دیده شود. */
  warn(module: string, action: string, context?: LogContext): void {
    if (isDev) {
      // biome-ignore lint/suspicious/noConsole: dev-only client diagnostics
      console.warn(`[${module}] ${action}`, context);
      return;
    }
    Sentry.captureMessage(`${module}: ${action}`, {
      level: 'warning',
      tags: { module, action, side: 'client' },
      extra: toExtra(module, action, context),
    });
  },
};
