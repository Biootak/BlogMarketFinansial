/**
 * server-logger — لاگر یکپارچهٔ سمت سرور
 * --------------------------------------------------------------------------
 *  ۲۰۲۶-۰۸-۰۷ — بازنویسی. نسخهٔ قبلی عملاً **هیچ لاگی نمی‌نوشت**:
 *
 *    error(): در development زودتر `return` می‌کرد (کاملاً no-op) و در
 *             production فقط Sentry می‌گرفت.
 *    warn():  در production `return` می‌کرد و در development بدنه‌اش خالی بود.
 *
 *  یعنی جدول `SystemLog` — که تنها منبع دادهٔ مرکز مشاهده‌پذیری است — را هیچ
 *  کس پر نمی‌کرد جز `prisma/seed.js` و سه فراخوانی پراکنده. داشبورد پایش روی
 *  یک جدول تقریباً خالی کار می‌کرد و طبیعتاً چیزی نشان نمی‌داد.
 *
 *  حالا:
 *   - سطح همیشه canonical است (`@/lib/log-levels`) تا خواننده و نویسنده یک
 *     زبان داشته باشند.
 *   - نوشتن در دیتابیس fire-and-forget است؛ هرگز مسیر اصلی درخواست را کند
 *     یا خراب نمی‌کند و هرگز خطای خودش را دوباره لاگ نمی‌کند (حلقهٔ بی‌نهایت).
 *   - `prisma` با dynamic import صدا زده می‌شود تا وارد باندل edge نشود.
 *   - `serverLog.perf` قرارداد `duration=` را تولید می‌کند — همان چیزی که
 *     صدک‌های تأخیر و «کوئری‌های کند» از آن می‌خوانند. بدون این، ستون تأخیر
 *     همیشه «تخمینی» می‌ماند.
 *   - context قبل از ذخیره از کلیدهای حساس پاک می‌شود.
 *
 *  خاموش کردن نوشتن در DB: `SYSTEM_LOG_PERSIST=false`
 * --------------------------------------------------------------------------
 */

import { type LogLevel, normalizeLogLevel } from '@/lib/log-levels';
import * as Sentry from '@sentry/nextjs';

const isDev = process.env.NODE_ENV === 'development';
const isEdge = process.env.NEXT_RUNTIME === 'edge';
const persistEnabled = process.env.SYSTEM_LOG_PERSIST !== 'false';

const MAX_MESSAGE = 2_000;
const MAX_SOURCE = 100;

type LogContext = Record<string, unknown> | Error | unknown;

/** کلیدهایی که هرگز نباید در متن لاگ ذخیره شوند. */
const SECRET_KEY_RE =
  /(pass(word)?|secret|token|authorization|cookie|session|api[_-]?key|private[_-]?key|otp|pin)/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 3) return '[deep]';
  if (value === null || value === undefined) return value;
  if (value instanceof Error) return { name: value.name, message: value.message };
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SECRET_KEY_RE.test(key) ? '[redacted]' : redact(item, depth + 1);
    }
    return out;
  }
  return value;
}

function toSentryExtra(context: LogContext): Record<string, unknown> {
  if (context instanceof Error) return { message: context.message, stack: context.stack };
  if (typeof context === 'object' && context !== null) return context as Record<string, unknown>;
  return { value: context };
}

function describe(context: LogContext): string {
  if (context === undefined) return '';
  if (context instanceof Error) return `${context.name}: ${context.message}`;
  if (typeof context === 'string') return context;
  try {
    return JSON.stringify(redact(context));
  } catch {
    return String(context);
  }
}

/**
 * نوشتن در `SystemLog`. هرگز throw نمی‌کند و هرگز await نمی‌شود.
 * اگر خودِ نوشتن شکست بخورد سکوت می‌کنیم — لاگ کردنِ شکستِ لاگر یعنی حلقه.
 */
function persist(level: LogLevel, source: string, message: string): void {
  if (!persistEnabled || isEdge) return;
  void (async () => {
    try {
      const { default: prisma } = await import('@/lib/db');
      await prisma.systemLog.create({
        data: {
          level,
          source: source.slice(0, MAX_SOURCE),
          message: message.slice(0, MAX_MESSAGE),
          timestamp: new Date(),
        },
      });
    } catch {
      /* عمداً خالی */
    }
  })();
}

function line(action: string, context: LogContext): string {
  const detail = describe(context);
  return detail ? `${action} — ${detail}` : action;
}

export const serverLog = {
  /**
   * خطاهای unexpected / internal.
   * @param module نام ماژول مثل 'auth-actions' — همین مقدار `source` می‌شود
   *   و `resolveServiceKey` از روی آن سرویس را تشخیص می‌دهد.
   * @param action نام عملیات مثل 'logout'
   * @param error خطا یا context
   */
  error(module: string, action: string, error: unknown): void {
    const message = line(action, error);
    if (isDev) {
      console.error(`[${module}] ${message}`);
    } else {
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { module, action },
        extra: redact(toSentryExtra(error)) as Record<string, unknown>,
      });
    }
    persist('error', module, message);
  },

  /** هشدارهای غیر-بحرانی. */
  warn(module: string, message: string, context?: LogContext): void {
    const text = line(message, context);
    if (isDev) console.warn(`[${module}] ${text}`);
    persist('warn', module, text);
  },

  /** رویدادهای عادی که ارزش ردیابی دارند (ورود موفق، انتشار پست، …). */
  info(module: string, message: string, context?: LogContext): void {
    const text = line(message, context);
    if (isDev) console.info(`[${module}] ${text}`);
    persist('info', module, text);
  },

  /**
   * ثبت زمان اجرا. قرارداد `duration=NNN` عمدی است: مرکز مشاهده‌پذیری دقیقاً
   * همین الگو را می‌خواند تا صدک‌های p50/p95/p99 «اندازه‌گیری‌شده» شوند نه
   * «مشتق‌شده». `[slow]` وقتی می‌آید که از آستانه رد شده باشیم.
   *
   *   serverLog.perf('api/posts', 'list', 148);
   */
  perf(module: string, action: string, durationMs: number, slowThresholdMs = 500): void {
    const ms = Number.isFinite(durationMs) ? Math.max(0, Math.round(durationMs)) : 0;
    const slow = ms >= slowThresholdMs;
    const text = `${slow ? '[slow]' : '[perf]'} ${action} duration=${ms}`;
    if (isDev && slow) console.warn(`[${module}] ${text}`);
    persist(slow ? 'warn' : 'info', module, text);
  },

  /** اندازه‌گیری خودکار یک عملیات async — نتیجه را دست‌نخورده پس می‌دهد. */
  async measure<T>(module: string, action: string, run: () => Promise<T>): Promise<T> {
    const startedAt = Date.now();
    try {
      return await run();
    } finally {
      serverLog.perf(module, action, Date.now() - startedAt);
    }
  },
};

export type { LogLevel };
