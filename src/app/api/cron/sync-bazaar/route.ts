/**
 * /api/cron/sync-bazaar
 * ----------------------------------------------------------------------------
 * Cron endpoint که TGJU را scrape می‌کند و نرخ‌ها را در Prisma `ExchangeRate`
 * upsert می‌کند.
 *
 * چرا این لازم است؟
 *  - قبلاً Navasan استفاده می‌شد ولی quota رایگانش تمام شده.
 *  - الان TGJU.org را scrape می‌کنیم (رایگان، بدون کلید).
 *  - cron هر ۱۰ دقیقه یک‌بار صدا زده می‌شود (Vercel Cron یا سرویس خارجی).
 *  - اگه TGJU شکست بخورد، silent fail می‌کنه و DB دست نخورده می‌مونه؛
 *    آخرین مقدار موفق همچنان به کاربر نشون داده می‌شه.
 *
 * Auth: `CRON_SECRET` env variable — هدر `x-cron-secret` یا query `?secret=`
 * باید با آن برابر باشد.
 *
 * کلاینت‌های مجاز:
 *  - Vercel Cron (هدر `Authorization: Bearer ${CRON_SECRET}`)
 *  - سرویس cron خارجی (هدر `x-cron-secret`)
 *  - تست دستی: `curl "http://localhost:3000/api/cron/sync-bazaar?secret=$CRON_SECRET"`
 *
 * نکته‌ی امنیتی: در production، حتماً CRON_SECRET تنظیم شود. اگر تنظیم
 * نشده باشد، endpoint غیرفعال است (۴۰۳) تا endpoint باز برای cron های
 * عمومی نباشد.
 * ----------------------------------------------------------------------------
 */

import { verifyCronSecret } from '@/lib/cron-auth';
import prisma from '@/lib/db';
import { revalidateTag } from '@/lib/revalidate';
import { type TgjuResponse, fetchTgjuLatest } from '@/lib/tgju';
import { type NextRequest, NextResponse } from 'next/server';

// Vercel Cron حداکثر execution time برای Hobby ۶۰ ثانیه است.
// scraper ما ۱۲ ثانیه timeout دارد + DB write ~ ۱-۲ ثانیه. حاشیه‌ی کافی.
export const maxDuration = 60;

/**
 * نگاشت TGJU key → (currency, name) برای upsert در DB.
 * دقیقاً معادل همان mapping در `freeMarketRates.ts` ولی فقط کلید‌هایی که
 * در DB می‌نویسیم (صرافی‌های مهم + طلا + سکه).
 */
const TGJU_TO_DB: Array<{
  tgjuKey: string;
  currency: string;
  name: string;
  rateType: 'BUY_SELL' | 'SINGLE_BULK';
  /** برای آیتم‌هایی که فقط قیمت واحد دارن (طلا، سکه، انس) */
  singleOnly?: boolean;
}> = [
  { tgjuKey: 'price_dollar_rl', currency: 'USD', name: 'دلار بازار آزاد', rateType: 'SINGLE_BULK' },
  { tgjuKey: 'price_eur', currency: 'EUR', name: 'یورو', rateType: 'SINGLE_BULK' },
  { tgjuKey: 'price_gbp', currency: 'GBP', name: 'پوند انگلیس', rateType: 'SINGLE_BULK' },
  { tgjuKey: 'price_aed', currency: 'AED', name: 'درهم امارات', rateType: 'SINGLE_BULK' },
  { tgjuKey: 'price_try', currency: 'TRY', name: 'لیر ترکیه', rateType: 'SINGLE_BULK' },
  { tgjuKey: 'price_cny', currency: 'CNY', name: 'یوان چین', rateType: 'SINGLE_BULK' },
  { tgjuKey: 'price_chf', currency: 'CHF', name: 'فرانک سوئیس', rateType: 'SINGLE_BULK' },
  { tgjuKey: 'price_cad', currency: 'CAD', name: 'دلار کانادا', rateType: 'SINGLE_BULK' },
  { tgjuKey: 'price_aud', currency: 'AUD', name: 'دلار استرالیا', rateType: 'SINGLE_BULK' },
  { tgjuKey: 'price_jpy', currency: 'JPY', name: 'ین ژاپن', rateType: 'SINGLE_BULK' },
  { tgjuKey: 'price_rub', currency: 'RUB', name: 'روبل روسیه', rateType: 'SINGLE_BULK' },
  { tgjuKey: 'price_inr', currency: 'INR', name: 'روپیه هند', rateType: 'SINGLE_BULK' },
  // طلا (تومان)
  { tgjuKey: 'geram18', currency: 'GOLD18', name: 'طلای ۱۸ عیار (گرم)', rateType: 'SINGLE_BULK' },
  { tgjuKey: 'mesghal', currency: 'MESGHAL', name: 'مثقال طلا', rateType: 'SINGLE_BULK' },
  // سکه (تومان) — 2026-07-04: TGJU prefix 'retail_' را حذف کرده؛ الان مستقیماً 'sekee' است
  { tgjuKey: 'sekee', currency: 'SEKKEH', name: 'سکه امامی', rateType: 'SINGLE_BULK' },
  { tgjuKey: 'sekeb', currency: 'SEKKEH_BAHAR', name: 'سکه بهار آزادی', rateType: 'SINGLE_BULK' },
  { tgjuKey: 'nim', currency: 'NIM_SEKKEH', name: 'نیم سکه', rateType: 'SINGLE_BULK' },
  { tgjuKey: 'rob', currency: 'ROB_SEKKEH', name: 'ربع سکه', rateType: 'SINGLE_BULK' },
  { tgjuKey: 'gerami', currency: 'GERAMI_SEKKEH', name: 'سکه گرمی', rateType: 'SINGLE_BULK' },
  // انس جهانی (USD/oz)
  { tgjuKey: 'ons', currency: 'GOLD_OZ', name: 'انس طلا', rateType: 'SINGLE_BULK' },
];

/**
 * آیتم TGJU را به فرمت DB تبدیل می‌کند.
 * TGJU قیمت را به صورت عددی (مثلاً 1,625,200) برمی‌گرداند.
 * ما آن را به **ریال** ذخیره می‌کنیم چون DB schema با String کار می‌کند
 * و رابط کاربری در نهایت /10 می‌کند (تومان).
 */
function formatPriceForDb(priceToman: number): string {
  // TGJU مقدار را به تومان می‌دهد. ما در DB ریال ذخیره می‌کنیم چون:
  //   - سازگار با `singleRate` (ریال) در بقیه‌ی کدبیس
  //   - تبدیل تومان↔ریال در consumer انجام می‌شود
  // برای سازگاری با رفتار قبلی (Navasan و DB):
  //   - فرمت فعلی DB: "127800" (تومان) — یعنی DB تومان ذخیره می‌کند
  //   - اما ExchangeRateCard.tsx:17 می‌گوید irrPrice ریال است (Math.floor(irrPrice / 10))
  // ما تومان را مستقیم در `singleRate` می‌نویسیم تا با سایر ردیف‌های DB سازگار باشد.
  return Math.round(priceToman).toString();
}

/**
 * upsert یک ردیف در ExchangeRate.
 * از name به‌عنوان unique key استفاده می‌کنیم چون در DB schema
 * `name String @unique` است.
 */
async function upsertRate(opts: {
  name: string;
  currency: string;
  rateType: 'BUY_SELL' | 'SINGLE_BULK';
  singleRate: string;
}): Promise<{ ok: boolean; action: 'created' | 'updated' }> {
  try {
    const existing = await prisma.exchangeRate.findUnique({
      where: { name: opts.name },
    });

    if (existing) {
      await prisma.exchangeRate.update({
        where: { id: existing.id },
        data: {
          singleRate: opts.singleRate,
          currency: opts.currency,
          rateType: opts.rateType,
        },
      });
      return { ok: true, action: 'updated' };
    }

    await prisma.exchangeRate.create({
      data: {
        name: opts.name,
        currency: opts.currency,
        rateType: opts.rateType,
        singleRate: opts.singleRate,
      },
    });
    return { ok: true, action: 'created' };
  } catch {
    return { ok: false, action: 'updated' };
  }
}

/**
 * Handler اصلی. دو حالت صدا زدن:
 *   GET /api/cron/sync-bazaar?secret=XXX (دستی)
 *   GET /api/cron/sync-bazaar (Vercel Cron با هدر Authorization)
 */
export async function GET(request: NextRequest) {
  // 1) Auth: only Authorization: Bearer CRON_SECRET (constant-time).
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  // 2) Scrape TGJU
  const t0 = Date.now();
  const scrape = await fetchTgjuLatest();

  if (!scrape.ok || !scrape.data) {
    return NextResponse.json(
      {
        ok: false,
        stage: 'scrape',
        error: scrape.error,
        latencyMs: Date.now() - t0,
      },
      { status: 502 },
    );
  }

  // 3) Upsert به DB
  const data: TgjuResponse = scrape.data;
  const results: Array<{
    name: string;
    currency: string;
    tgjuKey: string;
    price: number;
    action: 'created' | 'updated' | 'skipped' | 'failed';
    reason?: string;
  }> = [];

  for (const map of TGJU_TO_DB) {
    const item = data[map.tgjuKey];
    if (!item || item.value <= 0) {
      results.push({
        name: map.name,
        currency: map.currency,
        tgjuKey: map.tgjuKey,
        price: 0,
        action: 'skipped',
        reason: 'no-data',
      });
      continue;
    }

    const r = await upsertRate({
      name: map.name,
      currency: map.currency,
      rateType: map.rateType,
      singleRate: formatPriceForDb(item.value),
    });

    if (!r.ok) {
      results.push({
        name: map.name,
        currency: map.currency,
        tgjuKey: map.tgjuKey,
        price: item.value,
        action: 'failed',
      });
      continue;
    }

    results.push({
      name: map.name,
      currency: map.currency,
      tgjuKey: map.tgjuKey,
      price: item.value,
      action: r.action,
    });
  }

  // 4) Invalidate caches
  try {
    revalidateTag('market-rates:ticker');
    revalidateTag('market-rates:list');
    revalidateTag('market-rates:exchange-rates');
    revalidateTag('dashboard-exchange-rates');
  } catch {
    // revalidateTag failure is non-fatal; next request will hit fresh data
  }

  const created = results.filter((r) => r.action === 'created').length;
  const updated = results.filter((r) => r.action === 'updated').length;
  const skipped = results.filter((r) => r.action === 'skipped').length;
  const failed = results.filter((r) => r.action === 'failed').length;

  return NextResponse.json({
    ok: true,
    summary: {
      total: results.length,
      created,
      updated,
      skipped,
      failed,
    },
    results,
    scrape: {
      itemCount: scrape.itemCount,
      latencyMs: scrape.latencyMs,
    },
    durationMs: Date.now() - t0,
    timestamp: new Date().toISOString(),
  });
}
