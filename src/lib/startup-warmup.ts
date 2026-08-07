/**
 * startup-warmup.ts — 2026-08-perf
 * ─────────────────────────────────
 * یک‌بار بعد از startup سرور اجرا می‌شود.
 * هدف: cold start اولین request را به صفر برساند.
 *
 * 1. DB ping — TCP connection pool را warm می‌کند
 * 2. safeCache prime — hot data را از DB می‌کشد
 * 3. ISR pre-warm — صفحات ISR را prefetch می‌کند
 */

const log = (_msg: string) => {
  if (process.env.NODE_ENV === 'development') return; // در dev سکوت
};

export async function warmup(): Promise<void> {
  const start = performance.now();

  // ─── 1. DB ping ───────────────────────────────────────────────────────────
  // اولین connection همیشه کند است (TCP + TLS + auth).
  // این ping آن را قبل از اولین request کاربر انجام می‌دهد.
  try {
    const { default: prisma } = await import('@/lib/db');
    await prisma.$queryRaw`SELECT 1`;
    log(`DB ping ok (${Math.round(performance.now() - start)}ms)`);
  } catch (_e) {}

  // ─── 2. safeCache prime — hot data ───────────────────────────────────────
  // همه safeCache ها را موازی گرم می‌کند.
  // این یعنی اولین request کاربر از cache می‌خورد، نه از DB.
  const cacheStart = performance.now();
  try {
    const [
      { getMarketRates },
      { getSystemSettingsData },
      { getRateLists },
      { getLatestPostCategories },
    ] = await Promise.all([
      import('@/actions/market-rates'),
      import('@/data/getSystemSettings'),
      import('@/actions/rate-lists'),
      import('@/actions/getLatestPostCategories'),
    ]);

    await Promise.all([
      getMarketRates().catch(() => null),
      getSystemSettingsData().catch(() => null),
      getRateLists().catch(() => null),
      getLatestPostCategories().catch(() => null),
    ]);
    log(`safeCache primed (${Math.round(performance.now() - cacheStart)}ms)`);
  } catch (_e) {}

  // ─── 3. ISR pre-warm — صفحات پرمخاطب ─────────────────────────────────────
  // Next.js ISR صفحه را اولین بار که درخواست می‌شود می‌سازد (cold SSR).
  // با fetch کردن بعد از startup، اولین کاربر واقعی HTML کش‌شده می‌گیرد.
  // فقط در production و وقتی SITE_URL موجود است.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL;
  if (process.env.NODE_ENV === 'production' && siteUrl) {
    const warmStart = performance.now();
    const pages = ['/', '/exchanges', '/money-transfer', '/about', '/exchange-rates'];
    try {
      await Promise.allSettled(
        pages.map((path) =>
          fetch(`${siteUrl}${path}`, {
            method: 'GET',
            headers: { 'x-warmup': '1' },
            // cache: 'no-store' مهم است — نمی‌خواهیم browser cache
            cache: 'no-store',
          }).catch(() => null),
        ),
      );
      log(
        `ISR pre-warm done for ${pages.length} pages (${Math.round(performance.now() - warmStart)}ms)`,
      );
    } catch {
      // silent fail — pre-warm اختیاری است
    }
  }

  log(`total warmup: ${Math.round(performance.now() - start)}ms`);
}
