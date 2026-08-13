/**
 * Next.js Instrumentation Hook
 * ─────────────────────────────────────────────
 * اجرا می‌شود یک بار در سمت سرور بعد از startup.
 * وظایف:
 *   1. sharp global config — باید اول از همه اجرا شود، قبل از هر import دیگری.
 *      در standalone mode، route handler ها module cache مستقل دارند؛
 *      تنها راه قابل اعتماد برای global libvips config، instrumentation hook است.
 *      مستند رسمی: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 *   2. DB connection warm-up — اولین TCP handshake با PostgreSQL
 *      قبل از اولین request انجام می‌شود، نه روی آن.
 *   3. safeCache prime — market rates و settings را از DB
 *      می‌کشد تا in-memory cache پر شود.
 */

export async function register() {
  // فقط در سمت سرور اجرا کن — نه edge runtime
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // ── sharp global config — MUST be first ────────────────────────────────────
  // در Next.js standalone، import '@/lib/sharp-config' در upload/route.ts
  // فقط وقتی آن route اولین بار لود می‌شه اجرا می‌شه — بنابراین image optimizer
  // (/_next/image) که جداگانه init می‌شه، هرگز این config رو نمی‌بینه.
  // instrumentation.register() یک‌بار قبل از همه چیز اجرا می‌شه:
  // این تنها جایی است که sharp.cache و sharp.concurrency برای همه route ها
  // اعمال می‌شوند — شامل /_next/image که Next.js با sharp resize می‌کند.
  try {
    const sharp = await import('sharp');
    const s = sharp.default ?? sharp;
    // cache(false): libvips decoded pixel buffer را بعد از هر عملیات آزاد کن.
    // بدون این، libvips pixel های decode شده را cache می‌کند و در burst upload
    // چندین buffer همزمان در RAM می‌مانند — منبع spike های 50+ MB.
    s.cache(false);
    // concurrency(1): فقط یک libvips thread — Eco dyno یک vCPU دارد.
    // بیش از ۱ thread روی single-vCPU فقط context-switch overhead اضافه می‌کند.
    s.concurrency(1);
    // simd: free win برای سرعت، بدون اثر روی حافظه
    s.simd(true);
  } catch {
    // sharp ممکن است در edge runtime در دسترس نباشد — ignore
  }

  const { warmup } = await import('./src/lib/startup-warmup');
  // non-blocking — اگر خطا داد، سرور را crash نکند
  warmup().catch((_e) => {});
}
