/**
 * scripts/scrape-and-push-rates.ts
 *
 * روی GitHub Actions اجرا می‌شه (هر 5 دقیقه).
 * scraping کامل TGJU + bonbast + USDT + FX را اینجا انجام می‌ده،
 * نتیجه را به /api/cron/push-rates روی web dyno push می‌کنه.
 *
 * web dyno هیچ scraping نمی‌کنه — فقط JSON نهایی را می‌گیره.
 * spike RAM روی dyno: صفر.
 */

import { assembleMarketRates } from '../src/lib/market-rates/assembler';

const APP_URL = process.env.APP_URL ?? '';
const CRON_SECRET = process.env.CRON_SECRET ?? '';

if (!APP_URL || !CRON_SECRET) {
  console.error('APP_URL and CRON_SECRET are required');
  process.exit(1);
}

async function main() {
  console.log('=== scrape-and-push-rates starting ===');
  const t0 = Date.now();

  // scraping روی این ماشین (GitHub Actions) — نه روی web dyno
  console.log('Assembling market rates...');
  const items = await assembleMarketRates();

  if (items.length === 0) {
    console.error('ERROR: assembleMarketRates returned empty array');
    process.exit(1);
  }

  console.log(`Assembled ${items.length} items in ${Date.now() - t0}ms`);

  // push نتیجه به web dyno
  const pushUrl = `${APP_URL}/api/cron/push-rates`;
  console.log(`Pushing to ${pushUrl}...`);

  const res = await fetch(pushUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CRON_SECRET}`,
    },
    body: JSON.stringify({ rates: items }),
    signal: AbortSignal.timeout(30_000),
  });

  const body = await res.text();
  console.log(`HTTP ${res.status}: ${body}`);

  if (!res.ok) {
    console.error(`Push failed: ${res.status}`);
    process.exit(1);
  }

  console.log(`=== Done in ${Date.now() - t0}ms ===`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
