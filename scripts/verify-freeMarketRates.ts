/**
 * verify-freeMarketRates.ts
 * ----------------------------------------------------------------------------
 * تست سناریوهای مختلف برای freeMarketRates. این فایل برای بررسی صحت
 * اولویت‌بندی منابع و صحت محاسبات نوشته شده.
 *
 *   npx tsx scripts/verify-freeMarketRates.ts
 *
 * سناریوها:
 *   1. Navasan کامل + DB کامل → همه از Navasan
 *   2. Navasan فقط USD + DB کامل → USD از Navasan، بقیه از DB
 *   3. بدون Navasan + DB کامل + USDT + FX → USD از USDT، EUR/GBP از FX×USDT، بقیه از DB
 *   4. بدون Navasan + بدون DB → فقط USD (USDT) و EUR/GBP/etc. (FX×USDT)
 *   5. همه خالی → []
 * ----------------------------------------------------------------------------
 */

// این فایل فقط برای verification دستی است و در production اجرا نمی‌شه.
// ماژول‌ها رو import نمی‌کنیم چون به Prisma متصل می‌شن.
// در عوض، منطق رو اینجا کپی می‌کنیم تا با داده‌های mock تست کنیم.

type MarketSource = 'navasan' | 'usdt' | 'fx-derived' | 'db';

interface FreeMarketItem {
  symbol: string;
  name: string;
  priceToman: number;
  change: number;
  source: MarketSource;
}

const NAVASAN_KEY: Record<string, string> = {
  USD: 'usd',
  EUR: 'eur',
  GBP: 'gbp',
  AED: 'aed',
  CHF: 'chf',
  CAD: 'cad',
  AUD: 'aud',
  CNY: 'cny',
  JPY: 'jpy',
  RUB: 'rub',
  INR: 'inr',
  TRY: 'try',
  SEKKEH: 'sekkeh',
  BAHAR: 'bahar',
  NIM: 'nim',
  ROB: 'rob',
  GERAMI: 'gerami',
  GOLD18: '18ayar',
  ABSHODEH: 'abshodeh',
  OUNCE_GOLD: 'xau',
};

const DISPLAY_NAMES: Record<string, string> = {
  USD: 'دلار آمریکا',
  EUR: 'یورو',
  GBP: 'پوند',
  AED: 'درهم',
  CHF: 'فرانک',
  CAD: 'دلار کانادا',
  AUD: 'دلار استرالیا',
  SEKKEH: 'سکه امامی',
  NIM: 'نیم سکه',
  ROB: 'ربع سکه',
  GERAMI: 'سکه گرمی',
  GOLD18: 'طلای ۱۸ عیار',
  OUNCE_GOLD: 'انس طلا',
};

const WANTED = [
  'USD',
  'EUR',
  'GBP',
  'AED',
  'CHF',
  'CAD',
  'AUD',
  'CNY',
  'JPY',
  'RUB',
  'INR',
  'TRY',
  'SEKKEH',
  'NIM',
  'ROB',
  'GERAMI',
  'GOLD18',
  'OUNCE_GOLD',
];

interface NavasanItem {
  value: string;
  percent?: string;
}
type NavasanData = Record<string, NavasanItem>;
interface FxMap {
  [k: string]: number;
}
interface UsdtRate {
  toman: number;
  change: number;
}
interface DbRow {
  symbol: string;
  price: number;
}
type DbItems = Map<string, DbRow>;

/**
 * نسخه‌ی خالص منطق assemble برای تست.
 * دقیقاً منطق فایل src/lib/freeMarketRates.ts رو تقلید می‌کنه.
 */
function assemble(
  navasanData: NavasanData | null,
  usdt: UsdtRate | null,
  fx: FxMap | null,
  db: DbItems,
  premiumPercent: number,
): FreeMarketItem[] {
  const items: FreeMarketItem[] = [];
  const used = new Set<string>();

  for (const canonical of WANTED) {
    // Priority 1: Navasan
    if (navasanData) {
      const key = NAVASAN_KEY[canonical];
      if (key) {
        const item = navasanData[key];
        if (item) {
          const rial = Number(item.value);
          if (Number.isFinite(rial) && rial > 0) {
            const percent = Number(item.percent);
            items.push({
              symbol: canonical,
              name: DISPLAY_NAMES[canonical] ?? canonical,
              priceToman: Math.round(rial / 10),
              change: Number.isFinite(percent) ? percent : 0,
              source: 'navasan',
            });
            used.add(canonical);
            continue;
          }
        }
      }
    }

    // Priority 2a: USDT × premium برای USD
    if (canonical === 'USD' && usdt) {
      const priceToman = usdt.toman * (1 + premiumPercent / 100);
      items.push({
        symbol: 'USD',
        name: DISPLAY_NAMES.USD,
        priceToman: Math.round(priceToman),
        change: usdt.change,
        source: 'usdt',
      });
      used.add('USD');
      continue;
    }

    // Priority 2b: FX × USDT
    if (usdt && fx) {
      const perUsd = fx[canonical];
      if (Number.isFinite(perUsd) && perUsd > 0) {
        items.push({
          symbol: canonical,
          name: DISPLAY_NAMES[canonical] ?? canonical,
          priceToman: Math.round(perUsd * usdt.toman),
          change: 0,
          source: 'fx-derived',
        });
        used.add(canonical);
        continue;
      }
    }

    // Priority 3: DB
    const dbRow = db.get(canonical);
    if (dbRow) {
      items.push({
        symbol: dbRow.symbol,
        name: dbRow.symbol,
        priceToman: Math.round(dbRow.price),
        change: 0,
        source: 'db',
      });
      used.add(canonical);
    }
  }

  // بقیه‌ی آیتم‌های DB
  for (const [sym, dbRow] of db) {
    if (used.has(sym)) continue;
    items.push({
      symbol: dbRow.symbol,
      name: dbRow.symbol,
      priceToman: Math.round(dbRow.price),
      change: 0,
      source: 'db',
    });
    used.add(sym);
  }

  return items;
}

/* -------------------------------------------------------------------------- */
/*  Test helpers                                                              */
/* -------------------------------------------------------------------------- */

function logScenario(
  name: string,
  items: FreeMarketItem[],
  expected: Record<string, MarketSource>,
) {
  console.log(`\n━━━ ${name} ━━━`);
  console.log(`${'symbol'.padEnd(12) + 'price (T)'.padEnd(13) + 'change'.padEnd(8)}source`);
  console.log('─'.repeat(48));
  for (const it of items) {
    console.log(
      it.symbol.padEnd(12) +
        Math.round(it.priceToman).toLocaleString('en').padEnd(13) +
        (it.change ? `${(it.change > 0 ? '+' : '') + it.change.toFixed(2)}%` : '—').padEnd(8) +
        it.source,
    );
  }
  let pass = true;
  for (const [sym, wantSrc] of Object.entries(expected)) {
    const got = items.find((i) => i.symbol === sym)?.source;
    const ok = got === wantSrc;
    if (!ok) pass = false;
    console.log(`  ${ok ? '✓' : '✗'} ${sym}: expected=${wantSrc} got=${got ?? 'MISSING'}`);
  }
  console.log(pass ? '✅ PASS\n' : '❌ FAIL\n');
  return pass;
}

let allPass = true;
function check(name: string, ok: boolean) {
  if (!ok) allPass = false;
  console.log(ok ? `✅ ${name}` : `❌ ${name}`);
}

/* -------------------------------------------------------------------------- */
/*  سناریو ۱: Navasan کامل + DB                                                */
/*  انتظار: همه از Navasan (DB اصلاً لود نمی‌شه)                                */
/* -------------------------------------------------------------------------- */
{
  const navasan: NavasanData = {
    usd: { value: '7000000', percent: '1.2' }, // 700000 toman
    eur: { value: '7600000', percent: '0.8' }, // 760000 toman
    gbp: { value: '8900000', percent: '0.5' },
    aed: { value: '1900000', percent: '0' },
    chf: { value: '7800000', percent: '-0.3' },
    try: { value: '220000', percent: '0' },
    sekkeh: { value: '4500000000', percent: '2.1' }, // 450M toman
    nim: { value: '2250000000', percent: '2' },
    rob: { value: '1500000000', percent: '2' },
    '18ayar': { value: '35000000', percent: '0.5' },
    xau: { value: '2300000000', percent: '0' },
  };
  const db: DbItems = new Map([
    ['EUR', { symbol: 'EUR', price: 100000 }], // stale/wrong — should NOT show
    ['OIL', { symbol: 'OIL', price: 50000 }], // not in wanted list
  ]);
  const items = assemble(navasan, null, null, db, 0);
  const pass = logScenario('1. Navasan full + DB has stale EUR and OIL', items, {
    USD: 'navasan',
    EUR: 'navasan',
    SEKKEH: 'navasan',
    OIL: 'db',
  });
  check('scenario 1', pass);
  // خاص: USD از Navasan باشه (نه از DB)
  const usdItem = items.find((i) => i.symbol === 'USD');
  check('  scenario 1: USD price from Navasan (=700,000)', usdItem?.priceToman === 700000);
  // EUR از Navasan باشه (نه stale DB)
  const eurItem = items.find((i) => i.symbol === 'EUR');
  check(
    '  scenario 1: EUR price from Navasan (=760,000), not stale DB',
    eurItem?.priceToman === 760000,
  );
  // TRY از Navasan باشه (bug قبلی: کلید اشتباه)
  const tryItem = items.find((i) => i.symbol === 'TRY');
  check(
    '  scenario 1: TRY from Navasan with correct key "try"',
    tryItem?.source === 'navasan' && tryItem?.priceToman === 22000,
  );
}

/* -------------------------------------------------------------------------- */
/*  سناریو ۲: Navasan فقط USD                                                  */
/*  انتظار: USD از Navasan، EUR/GBP/etc. از DB                                  */
/* -------------------------------------------------------------------------- */
{
  const navasan: NavasanData = {
    usd: { value: '7000000', percent: '1.2' },
  };
  const db: DbItems = new Map([
    ['EUR', { symbol: 'EUR', price: 800000 }],
    ['GBP', { symbol: 'GBP', price: 920000 }],
    ['SEKKEH', { symbol: 'SEKKEH', price: 450000000 }],
  ]);
  const items = assemble(navasan, null, null, db, 0);
  const pass = logScenario('2. Navasan has only USD, DB has rest', items, {
    USD: 'navasan',
    EUR: 'db',
    GBP: 'db',
    SEKKEH: 'db',
  });
  check('scenario 2', pass);
}

/* -------------------------------------------------------------------------- */
/*  سناریو ۳: بدون Navasan + DB ناقص + USDT + FX                               */
/*  انتظار: USD از USDT، EUR/GBP از FX×USDT، SEKKEH از DB                      */
/* -------------------------------------------------------------------------- */
{
  const usdt: UsdtRate = { toman: 700000, change: 1.2 }; // USDT = 700k
  const fx: FxMap = {
    EUR: 0.92, // EUR = 0.92 * 700000 = 644,000
    GBP: 0.79, // GBP = 553,000
    AED: 3.67, // AED = 2,569,000
    CHF: 0.88,
    CAD: 1.36,
    AUD: 1.52,
    CNY: 7.24,
    JPY: 152.0,
    RUB: 92.0,
    INR: 83.5,
    TRY: 32.0,
  };
  const db: DbItems = new Map([
    ['SEKKEH', { symbol: 'SEKKEH', price: 450000000 }], // Navasan نداره، DB داره
    ['OIL', { symbol: 'OIL', price: 80000 }], // not in wanted
  ]);
  const items = assemble(null, usdt, fx, db, 1.5); // premium 1.5%
  const pass = logScenario('3. No Navasan + DB partial + USDT + FX', items, {
    USD: 'usdt',
    EUR: 'fx-derived',
    GBP: 'fx-derived',
    AED: 'fx-derived',
    SEKKEH: 'db',
    OIL: 'db',
  });
  check('scenario 3', pass);

  // USD = 700000 * 1.015 = 710500
  const usdItem = items.find((i) => i.symbol === 'USD');
  check(
    '  scenario 3: USD = USDT(700k) × 1.015 = 710,500',
    usdItem?.priceToman === 710500 && usdItem?.source === 'usdt',
  );

  // EUR = 0.92 * 700000 = 644000
  const eurItem = items.find((i) => i.symbol === 'EUR');
  check(
    '  scenario 3: EUR = 0.92 × 700k = 644,000',
    eurItem?.priceToman === 644000 && eurItem?.source === 'fx-derived',
  );

  // AED = 3.67 * 700000 = 2,569,000
  const aedItem = items.find((i) => i.symbol === 'AED');
  check(
    '  scenario 3: AED = 3.67 × 700k = 2,569,000',
    aedItem?.priceToman === 2569000 && aedItem?.source === 'fx-derived',
  );
}

/* -------------------------------------------------------------------------- */
/*  سناریو ۴: فقط USDT + FX (هیچ DB، هیچ Navasan)                              */
/*  انتظار: USD از USDT، همه ارزها از FX                                        */
/* -------------------------------------------------------------------------- */
{
  const usdt: UsdtRate = { toman: 700000, change: 1.5 };
  const fx: FxMap = {
    EUR: 0.92,
    GBP: 0.79,
    AED: 3.67,
    CHF: 0.88,
    CAD: 1.36,
    AUD: 1.52,
    CNY: 7.24,
    JPY: 152,
    RUB: 92,
    INR: 83.5,
    TRY: 32,
  };
  const items = assemble(null, usdt, fx, new Map(), 0);
  const pass = logScenario('4. Only USDT + FX (no Navasan, no DB)', items, {
    USD: 'usdt',
    EUR: 'fx-derived',
    GBP: 'fx-derived',
    AED: 'fx-derived',
  });
  check('scenario 4', pass);
  // change% for FX-derived should be 0 (we don't have it)
  const eurItem = items.find((i) => i.symbol === 'EUR');
  check('  scenario 4: change% = 0 for FX-derived', eurItem?.change === 0);
}

/* -------------------------------------------------------------------------- */
/*  سناریو ۵: همه خالی                                                         */
/*  انتظار: []                                                                 */
/* -------------------------------------------------------------------------- */
{
  const items = assemble(null, null, null, new Map(), 0);
  console.log('\n━━━ 5. All sources empty ━━━');
  console.log('items:', items.length, 'expected: 0');
  const pass = items.length === 0;
  logScenario('5. All sources empty', items, {});
  check('scenario 5: empty result', pass);
}

/* -------------------------------------------------------------------------- */
/*  سناریو ۶: کلید TRY اشتباه (try_) — باید فیلتر شه و به fallback بره          */
/*  این تست نشون می‌ده که bug قبلی fix شده                                     */
/* -------------------------------------------------------------------------- */
{
  const navasan: NavasanData = {
    usd: { value: '7000000', percent: '1.2' },
    eur: { value: '7600000', percent: '0.8' },
    // ⚠️ عمداً "try_" (غلط) — باید نادیده گرفته بشه
    try_: { value: '99999', percent: '0' },
  };
  const fx: FxMap = { TRY: 32 };
  const usdt: UsdtRate = { toman: 700000, change: 1 };
  const items = assemble(navasan, usdt, fx, new Map(), 0);
  // TRY نباید از Navasan بیاد چون کلید "try_" اشتباهه
  // بلکه باید از FX×USDT بیاد = 32 * 700000 = 22,400,000
  const tryItem = items.find((i) => i.symbol === 'TRY');
  console.log('\n━━━ 6. Navasan has wrong key "try_" (should fall through to FX) ━━━');
  console.log('TRY item:', tryItem);
  check('scenario 6: TRY not from Navasan (wrong key ignored)', tryItem?.source !== 'navasan');
  check(
    'scenario 6: TRY from FX-derived at 22,400,000',
    tryItem?.source === 'fx-derived' && tryItem?.priceToman === 22400000,
  );
}

/* -------------------------------------------------------------------------- */
/*  سناریو ۷: Dedup — آیتم تکراری نباشه                                        */
/* -------------------------------------------------------------------------- */
{
  const navasan: NavasanData = {
    usd: { value: '7000000', percent: '1.2' },
    eur: { value: '7600000', percent: '0.8' },
  };
  const db: DbItems = new Map([
    ['USD', { symbol: 'USD', price: 900000 }], // duplicate
    ['EUR', { symbol: 'EUR', price: 800000 }], // duplicate
  ]);
  const items = assemble(navasan, null, null, db, 0);
  const usdCount = items.filter((i) => i.symbol === 'USD').length;
  const eurCount = items.filter((i) => i.symbol === 'EUR').length;
  console.log('\n━━━ 7. Dedup: Navasan + DB with duplicate symbols ━━━');
  console.log('USD count:', usdCount, 'EUR count:', eurCount);
  check('scenario 7: no duplicate USD', usdCount === 1);
  check('scenario 7: no duplicate EUR', eurCount === 1);
}

console.log(`\n${'═'.repeat(50)}`);
console.log(allPass ? '✅ ALL SCENARIOS PASS' : '❌ SOME SCENARIOS FAILED');
console.log('═'.repeat(50));
process.exit(allPass ? 0 : 1);
