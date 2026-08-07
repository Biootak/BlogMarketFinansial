/**
 * log-levels.ts — واژگان واحد سطح لاگ (۲۰۲۶-۰۸-۰۷)
 * ─────────────────────────────────────────────────────────────
 *  چرا این فایل وجود دارد:
 *  تا امروز سه واژگان متفاوت برای یک ستون داشتیم:
 *    - `prisma/seed.js`           → 'INFO' | 'WARNING' | 'ERROR'
 *    - `/api/system-logs`         → allowlist مخلوط lower/UPPER بدون 'fatal'
 *    - `src/lib/observability.ts` → فقط 'error' | 'fatal' (lowercase)
 *
 *  نتیجهٔ عملی: کوئری `level: { in: ['error','fatal'] }` هرگز ردیف‌های
 *  `'ERROR'` را برنمی‌گرداند. یعنی روی دیتابیسی که پر از خطا بود، دفتر خطا،
 *  نرخ خطا، پنجره‌های بحرانی و توزیع سطوح **همیشه صفر** نشان می‌دادند.
 *
 *  از این پس تنها منبع حقیقت همین فایل است:
 *   - `normalizeLogLevel` هر املایی را به یکی از پنج سطح قانونی می‌آورد.
 *   - `ERROR_LEVEL_DB_VARIANTS` برای کوئری روی دادهٔ تاریخی استفاده می‌شود
 *     تا برای خواندن درست، مهاجرت داده لازم نباشد.
 *   - نوشتن هر لاگ تازه همیشه با سطح canonical (lowercase) انجام می‌شود.
 *
 *  فایل عمداً خالص و ایزومورفیک است (بدون `server-only`) چون API، لایهٔ داده
 *  و اسکریپت seed هر سه به آن نیاز دارند.
 */

/** پنج سطح قانونی — و تنها پنج سطح قانونی. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export const LOG_LEVELS: readonly LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'] as const;

/** شدت عددی — برای مقایسه و آستانه‌گذاری. */
const SEVERITY: Readonly<Record<LogLevel, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

/**
 * هر املایی که ممکن است در دیتابیس یا ورودی API دیده شود → سطح قانونی.
 * کلیدها همیشه lowercase هستند؛ تطبیق پس از `trim().toLowerCase()` انجام می‌شود.
 */
const ALIASES: Readonly<Record<string, LogLevel>> = {
  trace: 'debug',
  verbose: 'debug',
  debug: 'debug',
  dbg: 'debug',
  info: 'info',
  information: 'info',
  informational: 'info',
  notice: 'info',
  log: 'info',
  warn: 'warn',
  warning: 'warn',
  error: 'error',
  err: 'error',
  fatal: 'fatal',
  critical: 'fatal',
  crit: 'fatal',
};

/**
 * نرمال‌سازی سطح. هرگز throw نمی‌کند و برای ورودی ناشناخته `info` می‌دهد —
 * چون «نمی‌دانم» هرگز نباید به‌عنوان خطا شمرده شود و آمار را آلوده کند.
 */
export function normalizeLogLevel(raw: string | null | undefined): LogLevel {
  if (typeof raw !== 'string') return 'info';
  return ALIASES[raw.trim().toLowerCase()] ?? 'info';
}

/** true یعنی این املا را می‌شناسیم — برای اعتبارسنجی ورودی API. */
export function isKnownLogLevel(raw: string | null | undefined): boolean {
  if (typeof raw !== 'string') return false;
  return ALIASES[raw.trim().toLowerCase()] !== undefined;
}

export function isErrorLevel(raw: string | null | undefined): boolean {
  const level = normalizeLogLevel(raw);
  return level === 'error' || level === 'fatal';
}

export function isWarnLevel(raw: string | null | undefined): boolean {
  return normalizeLogLevel(raw) === 'warn';
}

export function severityOf(raw: string | null | undefined): number {
  return SEVERITY[normalizeLogLevel(raw)];
}

/** سه املای رایج یک واژه: lower / UPPER / Title. */
function casings(word: string): string[] {
  return [word, word.toUpperCase(), word.charAt(0).toUpperCase() + word.slice(1)];
}

/**
 * همهٔ املاهایی که در دیتابیس می‌توانند نمایندهٔ این سطوح باشند.
 * مصرف: `where: { level: { in: dbVariantsFor(['error','fatal']) } }`
 *
 * چرا به‌جای مهاجرت داده: ردیف‌های تاریخی با UPPERCASE نوشته شده‌اند و یک
 * migration یک‌باره جلوی نویسندهٔ بعدی را نمی‌گیرد. خواندنِ سازگار + نوشتنِ
 * canonical هر دو مشکل را با هم حل می‌کند.
 */
export function dbVariantsFor(levels: readonly LogLevel[]): string[] {
  const wanted = new Set<LogLevel>(levels);
  const out = new Set<string>();
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    if (!wanted.has(canonical)) continue;
    for (const variant of casings(alias)) out.add(variant);
  }
  return Array.from(out);
}

export const ERROR_LEVEL_DB_VARIANTS: readonly string[] = dbVariantsFor(['error', 'fatal']);
export const WARN_LEVEL_DB_VARIANTS: readonly string[] = dbVariantsFor(['warn']);
