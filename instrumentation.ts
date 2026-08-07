/**
 * Next.js Instrumentation Hook — 2026-08-perf
 * ─────────────────────────────────────────────
 * اجرا می‌شود یک بار در سمت سرور بعد از startup.
 * وظایف:
 *   1. DB connection warm-up — اولین TCP handshake با PostgreSQL
 *      قبل از اولین request انجام می‌شود، نه روی آن.
 *   2. ISR pre-warm — صفحات پرمخاطب را fetch می‌کند تا HTML
 *      در Next.js data cache گرم شود.
 *   3. safeCache prime — market rates و settings را از DB
 *      می‌کشد تا in-memory cache پر شود.
 *
 * مستند رسمی: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */

export async function register() {
  // فقط در سمت سرور اجرا کن — نه edge runtime
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { warmup } = await import('./src/lib/startup-warmup');
  // non-blocking — اگر خطا داد، سرور را crash نکند
  warmup().catch((_e) => {});
}
