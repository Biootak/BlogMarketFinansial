// scripts/backfill-market-rates.mjs
// یک‌بار اجرا: node scripts/backfill-market-rates.mjs
// داده‌های فعلی ExchangeRate را از `currency` به `symbol` نگاشت می‌کند.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LEGACY_TO_SYMBOL = {
  USD: 'IRAN_USD',
  EUR: 'IRAN_EUR',
  GBP: 'IRAN_GBP',
  AED: 'IRAN_AED',
  CHF: 'IRAN_CHF',
  CAD: 'IRAN_CAD',
  AUD: 'IRAN_AUD',
  CNY: 'IRAN_CNY',
  JPY: 'IRAN_JPY',
  RUB: 'IRAN_RUB',
  INR: 'IRAN_INR',
  TRY: 'IRAN_TRY',
  SEKKEH: 'IRAN_COIN_EMAMI',
  BAHAR: 'IRAN_COIN_BAHAR',
  NIM: 'IRAN_COIN_NIM',
  ROB: 'IRAN_COIN_ROB',
  GERAMI: 'IRAN_COIN_GERAMI',
  GOLD18: 'IRAN_GOLD_18K',
  ABSHODEH: 'IRAN_GOLD_MESGHAL',
  OUNCE_GOLD: 'GLOBAL_OUNCE_GOLD',
};

const TGJU_KEY_MAP = {
  USD: 'price_dollar_rl',
  EUR: 'price_eur',
  GBP: 'price_gbp',
  AED: 'price_aed',
  CHF: 'price_chf',
  CAD: 'price_cad',
  AUD: 'price_aud',
  CNY: 'price_cny',
  JPY: 'price_jpy',
  RUB: 'price_rub',
  INR: 'price_inr',
  TRY: 'price_try',
  SEKKEH: 'retail_sekee',
  BAHAR: 'retail_sekeb',
  NIM: 'retail_nim',
  ROB: 'retail_rob',
  GERAMI: 'retail_gerami',
  GOLD18: 'geram18',
  ABSHODEH: 'mesghal',
  OUNCE_GOLD: 'ons',
};

function getDefaultsFor(currency) {
  const isCoin = ['SEKKEH', 'BAHAR', 'NIM', 'ROB', 'GERAMI'].includes(currency);
  const isGold = ['GOLD18', 'ABSHODEH'].includes(currency);
  const isGlobal = currency === 'OUNCE_GOLD';
  if (isCoin) return { group: 'iran-coin', unit: 'toman', divisor: 10, decimals: 0, priority: 50 };
  if (isGold) return { group: 'iran-gold', unit: 'toman', divisor: 10, decimals: 0, priority: 50 };
  if (isGlobal) return { group: 'global', unit: 'usd', divisor: 1, decimals: 2, priority: 6 };
  return { group: 'iran-forex', unit: 'toman', divisor: 10, decimals: 0, priority: 50 };
}

async function main() {
  const rows = await prisma.exchangeRate.findMany();
  console.log('Found', rows.length, 'rows to backfill');

  let updated = 0, skipped = 0, noMapping = 0;
  for (const row of rows) {
    if (row.symbol) {
      skipped++;
      continue;
    }

    const newSymbol = LEGACY_TO_SYMBOL[row.currency];
    if (!newSymbol) {
      console.warn('  ! no mapping for currency:', row.currency, '(row id:', row.id, ')');
      noMapping++;
      continue;
    }

    const defaults = getDefaultsFor(row.currency);
    const provider = row.singleRate ? 'manual' : 'auto';
    const tgjuKey = provider === 'auto' ? TGJU_KEY_MAP[row.currency] : null;

    try {
      await prisma.exchangeRate.update({
        where: { id: row.id },
        data: {
          symbol: newSymbol,
          displayNameFa: row.name,
          group: defaults.group,
          unit: defaults.unit,
          divisor: defaults.divisor,
          decimals: defaults.decimals,
          priority: defaults.priority,
          provider,
          tgjuKey,
          active: true,
        },
      });
      updated++;
    } catch (e) {
      console.error('  x failed to update', row.id, e.message);
    }
  }

  console.log('Done. updated:', updated, 'skipped:', skipped, 'noMapping:', noMapping);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
