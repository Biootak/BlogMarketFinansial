// src/app/api/cron/refresh-market-rates/route.ts
//
// 2026-08-14: نقش این endpoint برگشت — «مسیر تازه‌سازی قابل‌اعتماد».
// GitHub Actions schedule در این repo throttle می‌شود (رن‌ها هر ۶۰-۹۰ دقیقه
// می‌آیند نه هر ۵ دقیقه — دیده‌شده 2026-08-14). مسیر قابل‌اعتماد، cron خارجی
// (cron-job.org — همان که /api/ping را هر ۵ دقیقه می‌زند) است که همین endpoint
// را با Bearer CRON_SECRET هر ۵ دقیقه صدا می‌زند.
//
// امنیت حافظه (dyno 512MB):
//   - فقط یک assemble هم‌زمان (lock) + حداقل فاصله ۶۰ ثانیه بین اجراها
//   - صفحات TGJU به‌صورت sequential fetch می‌شوند (یک HTML در هر لحظه)
//   - pageCache با TTL ۶ دقیقه (TGJU_FETCH_TTL_MS=360000 در prod) — اکثر اجراها
//     از کش می‌خورند و شبکه نمی‌روند
//   - مسیر request (getMarketRates) هرگز scrape نمی‌کند — این endpoint جدا است
//
// push-rates (GitHub Actions) همچنان به‌عنوان لایهٔ دوم/backup کار می‌کند؛ هر
// دو به persistMarketRates می‌رسند پس نتیجه یکسان و idempotent است.
//
// Auth: Bearer CRON_SECRET

import { persistMarketRates } from '@/actions/market-rates';
import { verifyCronSecret } from '@/lib/cron-auth';
import { assembleMarketRates } from '@/lib/market-rates';
import { NextResponse } from 'next/server';

// Lock — فقط یک assemble هم‌زمان (ضد overlap وقتی cron و GH هم‌زمان بزنند).
let running = false;
let lastRunAt = 0;
// حداقل فاصله بین اجراها — حتی اگر cron دو بار هم بزند، assemble تکراری نمی‌شود.
const MIN_INTERVAL_MS = 60_000;

export async function POST(req: Request) {
  return handleRefresh(req);
}
export async function GET(req: Request) {
  return handleRefresh(req);
}

async function handleRefresh(req: Request) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  const now = Date.now();

  // Already running → no-op 200 (cron client نباید retry کند؛ اجرای فعلی کافی است).
  if (running) {
    return NextResponse.json({ success: true, data: { note: 'already-running' } });
  }

  // Throttle — خیلی نزدیک به اجرای قبلی → no-op.
  if (now - lastRunAt < MIN_INTERVAL_MS) {
    return NextResponse.json({ success: true, data: { note: 'throttled' } });
  }

  running = true;
  try {
    lastRunAt = Date.now();
    const items = await assembleMarketRates();
    if (items.length === 0) throw new Error('ALL_SOURCES_FAILED');

    const { updated, snapshotCount } = await persistMarketRates(items);

    return NextResponse.json({
      success: true,
      data: { count: items.length, updated, snapshotCount },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    return NextResponse.json(
      { success: false, error: { code: 'REFRESH_FAILED', message } },
      { status: 502 },
    );
  } finally {
    running = false;
  }
}
