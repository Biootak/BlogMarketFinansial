/**
 * seed-market-rates.ts
 * ─────────────────────────────────────────────────────────────────────
 * یک‌بار اجرا کن تا همه ردیف‌های ExchangeRate با metadata کامل upsert بشن.
 *
 * Usage:
 *   npx tsx prisma/seed-market-rates.ts
 *
 * این اسکریپت idempotent است — بارها می‌توان اجرا کرد. فقط ردیف‌های
 * گمشده ایجاد می‌شوند و ردیف‌های موجود metadata آن‌ها به‌روز می‌شود
 * (به‌جز singleRate که توسط cron پر می‌شود).
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RateSeed {
  symbol: string;
  name: string;
  currency: string;
  displayNameFa: string;
  group: string;
  unit: string;
  divisor: number;
  decimals: number;
  priority: number;
  provider: 'auto' | 'manual';
  tgjuKey: string | null;
  active: boolean;
  /** مقدار اولیه برای manual ها — در تومان */
  singleRateInit?: number;
}

const SEEDS: RateSeed[] = [
  // ── Afghan ──────────────────────────────────────────────────────────
  {
    symbol: 'AFGHANI_USD',
    name: 'دلار هرات',
    currency: 'USD',
    displayNameFa: 'دلار هرات',
    group: 'afghan',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 2,
    provider: 'auto',
    // دلار هرات ≈ دلار تهران × فاکتور محلی. فعلاً از price_dollar_rl می‌گیریم.
    tgjuKey: 'price_dollar_rl',
    active: true,
  },
  {
    symbol: 'AFGHANI_AFN',
    name: 'افغانی',
    currency: 'AFN',
    displayNameFa: 'افغانی',
    group: 'afghan',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 3,
    provider: 'auto',
    tgjuKey: 'currency_price_afn',
    active: true,
  },

  // ── Iran Forex ───────────────────────────────────────────────────────
  {
    symbol: 'IRAN_USD',
    name: 'دلار تهران',
    currency: 'USD',
    displayNameFa: 'دلار تهران',
    group: 'iran-forex',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 1,
    provider: 'auto',
    tgjuKey: 'price_dollar_rl',
    active: true,
  },
  {
    symbol: 'IRAN_EUR',
    name: 'یورو',
    currency: 'EUR',
    displayNameFa: 'یورو',
    group: 'iran-forex',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 7,
    provider: 'auto',
    tgjuKey: 'price_eur',
    active: true,
  },
  {
    symbol: 'IRAN_GBP',
    name: 'پوند انگلیس',
    currency: 'GBP',
    displayNameFa: 'پوند انگلیس',
    group: 'iran-forex',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 9,
    provider: 'auto',
    tgjuKey: 'price_gbp',
    active: true,
  },
  {
    symbol: 'IRAN_AED',
    name: 'درهم امارات',
    currency: 'AED',
    displayNameFa: 'درهم امارات',
    group: 'iran-forex',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 8,
    provider: 'auto',
    tgjuKey: 'price_aed',
    active: true,
  },
  {
    symbol: 'IRAN_TRY',
    name: 'لیر ترکیه',
    currency: 'TRY',
    displayNameFa: 'لیر ترکیه',
    group: 'iran-forex',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 11,
    provider: 'auto',
    tgjuKey: 'price_try',
    active: true,
  },
  {
    symbol: 'IRAN_CHF',
    name: 'فرانک سوئیس',
    currency: 'CHF',
    displayNameFa: 'فرانک سوئیس',
    group: 'iran-forex',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 17,
    provider: 'auto',
    tgjuKey: 'price_chf',
    active: true,
  },
  {
    symbol: 'IRAN_CAD',
    name: 'دلار کانادا',
    currency: 'CAD',
    displayNameFa: 'دلار کانادا',
    group: 'iran-forex',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 18,
    provider: 'auto',
    tgjuKey: 'price_cad',
    active: true,
  },
  {
    symbol: 'IRAN_AUD',
    name: 'دلار استرالیا',
    currency: 'AUD',
    displayNameFa: 'دلار استرالیا',
    group: 'iran-forex',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 19,
    provider: 'auto',
    tgjuKey: 'price_aud',
    active: true,
  },
  {
    symbol: 'IRAN_CNY',
    name: 'یوان چین',
    currency: 'CNY',
    displayNameFa: 'یوان چین',
    group: 'iran-forex',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 12,
    provider: 'auto',
    tgjuKey: 'price_cny',
    active: true,
  },
  {
    symbol: 'IRAN_JPY',
    name: 'ین ژاپن',
    currency: 'JPY',
    displayNameFa: 'ین ژاپن',
    group: 'minor',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 20,
    provider: 'auto',
    tgjuKey: 'price_jpy',
    active: true,
  },
  {
    symbol: 'IRAN_RUB',
    name: 'روبل روسیه',
    currency: 'RUB',
    displayNameFa: 'روبل روسیه',
    group: 'minor',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 21,
    provider: 'auto',
    tgjuKey: 'price_rub',
    active: true,
  },
  {
    symbol: 'IRAN_INR',
    name: 'روپیه هند',
    currency: 'INR',
    displayNameFa: 'روپیه هند',
    group: 'minor',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 22,
    provider: 'auto',
    tgjuKey: 'price_inr',
    active: true,
  },

  // ── Iran Coin ────────────────────────────────────────────────────────
  // 2026-07-04: TGJU prefix 'retail_' را حذف کرده → 'sekee' (نه 'retail_sekee')
  {
    symbol: 'IRAN_COIN_EMAMI',
    name: 'سکه امامی',
    currency: 'SEKKEH',
    displayNameFa: 'سکه امامی',
    group: 'iran-coin',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 4,
    provider: 'auto',
    tgjuKey: 'sekee',
    active: true,
  },
  {
    symbol: 'IRAN_COIN_BAHAR',
    name: 'سکه بهار آزادی',
    currency: 'SEKKEH_BAHAR',
    displayNameFa: 'سکه بهار آزادی',
    group: 'iran-coin',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 10,
    provider: 'auto',
    tgjuKey: 'sekeb',
    active: true,
  },
  {
    symbol: 'IRAN_COIN_NIM',
    name: 'نیم سکه',
    currency: 'NIM_SEKKEH',
    displayNameFa: 'نیم سکه',
    group: 'iran-coin',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 13,
    provider: 'auto',
    tgjuKey: 'nim',
    active: true,
  },
  {
    symbol: 'IRAN_COIN_ROB',
    name: 'ربع سکه',
    currency: 'ROB_SEKKEH',
    displayNameFa: 'ربع سکه',
    group: 'iran-coin',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 14,
    provider: 'auto',
    tgjuKey: 'rob',
    active: true,
  },
  {
    symbol: 'IRAN_COIN_GERAMI',
    name: 'سکه گرمی',
    currency: 'GERAMI_SEKKEH',
    displayNameFa: 'سکه گرمی',
    group: 'iran-coin',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 15,
    provider: 'auto',
    tgjuKey: 'gerami',
    active: true,
  },

  // ── Iran Gold ────────────────────────────────────────────────────────
  {
    symbol: 'IRAN_GOLD_18K',
    name: 'طلای ۱۸ عیار',
    currency: 'GOLD18',
    displayNameFa: 'طلای ۱۸ عیار',
    group: 'iran-gold',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 5,
    provider: 'auto',
    tgjuKey: 'geram18',
    active: true,
  },
  {
    symbol: 'IRAN_GOLD_MESGHAL',
    name: 'مثقال طلا',
    currency: 'MESGHAL',
    displayNameFa: 'مثقال طلا',
    group: 'iran-gold',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 16,
    provider: 'auto',
    tgjuKey: 'mesghal',
    active: true,
  },

  // ── Global ───────────────────────────────────────────────────────────
  {
    symbol: 'GLOBAL_OUNCE_GOLD',
    name: 'انس طلا',
    currency: 'GOLD_OZ',
    displayNameFa: 'انس طلا',
    group: 'global',
    unit: 'usd',
    divisor: 1,
    decimals: 2,
    priority: 6,
    provider: 'auto',
    tgjuKey: 'ons',
    active: true,
  },
];

async function main() {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const seed of SEEDS) {
    try {
      // Check by symbol (unique)
      const existing = await prisma.exchangeRate.findFirst({
        where: { symbol: seed.symbol },
      });

      const data = {
        name: seed.name,
        currency: seed.currency,
        symbol: seed.symbol,
        displayNameFa: seed.displayNameFa,
        group: seed.group,
        unit: seed.unit,
        divisor: seed.divisor,
        decimals: seed.decimals,
        priority: seed.priority,
        provider: seed.provider,
        tgjuKey: seed.tgjuKey,
        active: seed.active,
        rateType: 'SINGLE_BULK' as const,
        ...(seed.singleRateInit !== undefined
          ? { singleRate: (seed.singleRateInit * 10).toString() }
          : {}),
      };

      if (existing) {
        // Update metadata but preserve singleRate (cron manages it)
        const { singleRate: _sr, ...metaOnly } = data;
        await prisma.exchangeRate.update({
          where: { id: existing.id },
          data: metaOnly,
        });
        updated++;
      } else {
        await prisma.exchangeRate.create({ data });
        created++;
      }
    } catch (e: unknown) {
      // P2002 = unique constraint — old row with same name but different symbol
      const err = e as { code?: string; message?: string };
      if (err.code === 'P2002') {
        skipped++;
      } else {
        process.stderr.write(`[seed] ${seed.symbol}: ${err.message ?? 'unknown error'}\n`);
      }
    }
  }

  process.stdout.write(`Seed done: created=${created} updated=${updated} skipped=${skipped}\n`);
  await prisma.$disconnect();
}

main().catch((e) => {
  process.stderr.write(`[seed] fatal: ${String(e)}\n`);
  process.exit(1);
});
