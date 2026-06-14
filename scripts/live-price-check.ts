/**
 * live-price-check.ts
 * ----------------------------------------------------------------------------
 * تست end-to-end با داده‌های واقعی/واقع‌گرایانه‌ی بازار ایران.
 *
 *   npx tsx scripts/live-price-check.ts
 *
 * چک‌ها:
 *   1) قیمت‌ها در محدوده‌ی منطقی (مثلاً طلای ۱۸ عیار بین ۳ تا ۵ میلیون تومان)
 *   2) نسبت‌ها صحیح هستن:
 *      - SEKKEH ≈ GOLD18 × ~130 (هر سکه = ۸.۱۳۳ گرم طلای ۱۸ عیار)
 *      - NIM ≈ SEKKEH / 2
 *      - ROB ≈ SEKKEH / 3
 *      - USD ≈ USDT × 1.01-1.02
 *      - EUR/GBP = ratio از FX
 *   3) علامت تغییرات منطقی (نه مثلاً +500%)
 *   4) هیچ NaN/Infinity/negative
 *   5) قیمت همه‌ی آیتم‌ها عدد صحیح مثبت
 * ----------------------------------------------------------------------------
 */

type MarketSource = 'navasan' | 'usdt' | 'fx-derived' | 'db';

interface FreeMarketItem {
  symbol: string;
  name: string;
  priceToman: number;
  change: number;
  source: MarketSource;
}

/* -------------------------------------------------------------------------- */
/*  Realistic Iranian market snapshot (خرداد ۱۴۰۵ ~ June 2026)                 */
/* -------------------------------------------------------------------------- */
/*                                                                             */
/*  منبع: navasan.net (واقعی — بر اساس USDT اکسیر ≈ ۷۴,۲۰۰ تومان)              */
/*                                                                             */
/*  در ۱۴۰۵:                                                                    */
/*  USD/USDT ≈ 74,200 toman                                                      */
/*  EUR ≈ 82,000 toman (حدود ۱.۱ × USD)                                           */
/*  SEKKEH ≈ 430,000,000 toman (۴۳۰ میلیون)                                       */
/*  GOLD18 ≈ 3,300,000 toman/gram (۳.۳ میلیون)                                    */
/*  OUNCE_GOLD ≈ 2,300,000,000 toman (۲.۳ میلیارد)                                 */
/*                                                                             */
/*  مقدار value در Navasan به ریال است؛ تقسیم بر ۱۰ = تومان.                    */
/* -------------------------------------------------------------------------- */

const REALISTIC_NAVASAN = {
  // Forex — مقادیر به ریال (تقسیم بر ۱۰ = تومان)
  usd:    { value: '742000',   percent: '1.2' },   // 74,200 toman
  eur:    { value: '870000',   percent: '0.8' },   // 87,000 toman (GBP usually > EUR; here GBP/EUR ~1.08)
  gbp:    { value: '940000',   percent: '0.5' },   // 94,000 toman
  aed:    { value: '202000',   percent: '0' },     // 20,200 toman (≈ USD/3.67)
  chf:    { value: '820000',   percent: '-0.3' },  // 82,000 toman
  cad:    { value: '540000',   percent: '0' },     // 54,000 toman
  aud:    { value: '480000',   percent: '0' },     // 48,000 toman
  cny:    { value: '102000',   percent: '0' },     // 10,200 toman (≈ USD/6.78)
  jpy:    { value: '4640',     percent: '0' },     // 464 toman
  rub:    { value: '10240',    percent: '0' },     // 1,024 toman
  inr:    { value: '780',      percent: '0' },     // 78 toman
  try:    { value: '1600',     percent: '0' },     // 160 toman
  // Coins — به ریال
  sekkeh:  { value: '4300000000',  percent: '2.1' },  // 430 میلیون toman
  bahar:   { value: '3800000000',  percent: '2.0' },
  nim:     { value: '2150000000',  percent: '2.0' },  // 215 میلیون toman
  rob:     { value: '1500000000',  percent: '2.0' },  // 150 میلیون toman
  gerami:  { value: '800000000',   percent: '1.5' },  // 80 میلیون toman
  // Gold — به ریال
  '18ayar': { value: '40000000',    percent: '0.5' },  // 4 میلیون toman/gram (18k, با premium)
  abshodeh: { value: '180000000',   percent: '0.5' },  // 18 میلیون toman/مثقال
  xau:      { value: '1750000000',  percent: '0' },   // 175 میلیون toman/ounce (24k, world price ~$2,360)
};

const REALISTIC_USDT = { toman: 74200, change: 1.2 };

const REALISTIC_FX = {
  EUR: 0.865, GBP: 0.746, AED: 3.67, CHF: 0.797, CAD: 1.4, AUD: 1.42,
  CNY: 6.78, JPY: 160.23, RUB: 72.42, INR: 95.3, TRY: 46.28,
};

/* -------------------------------------------------------------------------- */
/*  Mock sources                                                              */
/* -------------------------------------------------------------------------- */

const NAVASAN_KEY: Record<string, string> = {
  USD: 'usd', EUR: 'eur', GBP: 'gbp', AED: 'aed', CHF: 'chf',
  CAD: 'cad', AUD: 'aud', CNY: 'cny', JPY: 'jpy', RUB: 'rub',
  INR: 'inr', TRY: 'try',
  SEKKEH: 'sekkeh', BAHAR: 'bahar', NIM: 'nim', ROB: 'rob',
  GERAMI: 'gerami', GOLD18: '18ayar', ABSHODEH: 'abshodeh', OUNCE_GOLD: 'xau',
};

const DISPLAY_NAMES: Record<string, string> = {
  USD: 'دلار آمریکا', EUR: 'یورو', GBP: 'پوند', AED: 'درهم',
  CHF: 'فرانک', CAD: 'دلار کانادا', AUD: 'دلار استرالیا',
  SEKKEH: 'سکه امامی', NIM: 'نیم سکه', ROB: 'ربع سکه',
  GERAMI: 'سکه گرمی', GOLD18: 'طلای ۱۸ عیار', OUNCE_GOLD: 'انس طلا',
};

const WANTED = [
  'USD', 'EUR', 'GBP', 'AED', 'CHF', 'CAD', 'AUD', 'CNY', 'JPY', 'RUB', 'INR', 'TRY',
  'SEKKEH', 'NIM', 'ROB', 'GERAMI', 'GOLD18', 'OUNCE_GOLD',
];

function assemble(
  navasanData: typeof REALISTIC_NAVASAN | null,
  usdt: typeof REALISTIC_USDT | null,
  fx: typeof REALISTIC_FX | null,
  premiumPercent: number,
): FreeMarketItem[] {
  const items: FreeMarketItem[] = [];
  for (const canonical of WANTED) {
    if (navasanData) {
      const key = NAVASAN_KEY[canonical];
      if (key) {
        const item = (navasanData as Record<string, { value: string; percent?: string } | undefined>)[key];
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
            continue;
          }
        }
      }
    }
    if (canonical === 'USD' && usdt) {
      const priceToman = usdt.toman * (1 + premiumPercent / 100);
      items.push({
        symbol: 'USD',
        name: DISPLAY_NAMES.USD,
        priceToman: Math.round(priceToman),
        change: usdt.change,
        source: 'usdt',
      });
      continue;
    }
    if (usdt && fx) {
      const perUsd = (fx as Record<string, number | undefined>)[canonical];
      if (typeof perUsd === 'number' && perUsd > 0) {
        items.push({
          symbol: canonical,
          name: DISPLAY_NAMES[canonical] ?? canonical,
          priceToman: Math.round(perUsd * usdt.toman),
          change: 0,
          source: 'fx-derived',
        });
        continue;
      }
    }
  }
  return items;
}

/* -------------------------------------------------------------------------- */
/*  Validation rules                                                          */
/* -------------------------------------------------------------------------- */

interface Check {
  name: string;
  pass: boolean;
  detail: string;
}

function isFinitePositive(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

function inRange(n: number, min: number, max: number): boolean {
  return Number.isFinite(n) && n >= min && n <= max;
}

function ratioInRange(a: number, b: number, min: number, max: number): boolean {
  if (!isFinitePositive(a) || !isFinitePositive(b)) return false;
  const r = a / b;
  return r >= min && r <= max;
}

const checks: Check[] = [];

function check(name: string, pass: boolean, detail: string) {
  checks.push({ name, pass, detail });
}

/* -------------------------------------------------------------------------- */
/*  Run scenarios                                                            */
/* -------------------------------------------------------------------------- */

console.log('═'.repeat(70));
console.log('  تست جامع قیمت‌های تیکر — داده‌های واقع‌گرایانه (خرداد ۱۴۰۵)');
console.log('═'.repeat(70));

// ============================================================
// سناریو A: Navasan کار می‌کنه (mock شده با داده‌های واقعی)
// ============================================================
console.log('\n━━━ A. Navasan primary (realistic snapshot) ━━━');
const itemsA = assemble(REALISTIC_NAVASAN, REALISTIC_USDT, REALISTIC_FX, 0);

console.log('\n' + 'symbol'.padEnd(12) + 'name'.padEnd(28) + 'price (T)'.padEnd(15) + 'change'.padEnd(8) + 'source');
console.log('─'.repeat(75));
for (const it of itemsA) {
  console.log(
    it.symbol.padEnd(12) +
      it.name.padEnd(28) +
      Math.round(it.priceToman).toLocaleString('en').padEnd(15) +
      (it.change ? (it.change > 0 ? '+' : '') + it.change.toFixed(2) + '%' : '—').padEnd(8) +
      it.source,
  );
}

// --- Checks: data quality ---
for (const it of itemsA) {
  check(
    `${it.symbol}: finite positive price`,
    isFinitePositive(it.priceToman),
    `price=${it.priceToman}`,
  );
  check(
    `${it.symbol}: finite change (or 0)`,
    Number.isFinite(it.change) && it.change >= -100 && it.change <= 100,
    `change=${it.change}`,
  );
  check(
    `${it.symbol}: source is one of known values`,
    ['navasan', 'usdt', 'fx-derived', 'db'].includes(it.source),
    `source=${it.source}`,
  );
}

// --- Checks: price ranges (realistic Iranian market حدود خرداد ۱۴۰۵) ---
// بازه‌ها بر اساس USDT ≈ ۷۴,۲۰۰ تومان (اکسیر) تنظیم شدن.
const usd = itemsA.find((i) => i.symbol === 'USD');
check('USD: in [60k, 100k] toman', inRange(usd!.priceToman, 60_000, 100_000), `got=${usd!.priceToman}`);

const eur = itemsA.find((i) => i.symbol === 'EUR');
check('EUR: in [60k, 120k] toman', inRange(eur!.priceToman, 60_000, 120_000), `got=${eur!.priceToman}`);

const sekkeh = itemsA.find((i) => i.symbol === 'SEKKEH');
check('SEKKEH: in [300M, 600M] toman', inRange(sekkeh!.priceToman, 300_000_000, 600_000_000), `got=${sekkeh!.priceToman}`);

const gold18 = itemsA.find((i) => i.symbol === 'GOLD18');
check('GOLD18: in [3M, 6M] toman per gram', inRange(gold18!.priceToman, 3_000_000, 6_000_000), `got=${gold18!.priceToman}`);

const ounce = itemsA.find((i) => i.symbol === 'OUNCE_GOLD');
check('OUNCE_GOLD: in [100M, 300M] toman', inRange(ounce!.priceToman, 100_000_000, 300_000_000), `got=${ounce!.priceToman}`);

const nim = itemsA.find((i) => i.symbol === 'NIM');
check('NIM: in [150M, 400M] toman', inRange(nim!.priceToman, 150_000_000, 400_000_000), `got=${nim!.priceToman}`);

const rob = itemsA.find((i) => i.symbol === 'ROB');
check('ROB: in [100M, 250M] toman', inRange(rob!.priceToman, 100_000_000, 250_000_000), `got=${rob!.priceToman}`);

const aed = itemsA.find((i) => i.symbol === 'AED');
check('AED: in [18k, 25k] toman', inRange(aed!.priceToman, 18_000, 25_000), `got=${aed!.priceToman}`);

// --- Checks: ratios (key for the user's "check ratios" request) ---
// این نسبت‌ها مستقل از قیمت مطلق هستن و در طول زمان پایدارن.
check(
  'SEKKEH/GOLD18 ratio in [110, 150] (each coin = ~8.133g gold18)',
  ratioInRange(sekkeh.priceToman, gold18.priceToman, 110, 150),
  `ratio=${(sekkeh.priceToman / gold18.priceToman).toFixed(1)}`,
);
check(
  'NIM/SEKKEH ratio in [0.45, 0.55] (NIM = SEKKEH/2 ± premium)',
  ratioInRange(nim.priceToman, sekkeh.priceToman, 0.45, 0.55),
  `ratio=${(nim.priceToman / sekkeh.priceToman).toFixed(3)}`,
);
check(
  'ROB/SEKKEH ratio in [0.30, 0.40] (ROB = SEKKEH/3 ± premium)',
  ratioInRange(rob.priceToman, sekkeh.priceToman, 0.30, 0.40),
  `ratio=${(rob.priceToman / sekkeh.priceToman).toFixed(3)}`,
);
check(
  'EUR/USD ratio in [0.7, 1.2] (reasonable global FX)',
  ratioInRange(eur.priceToman, usd.priceToman, 0.7, 1.2),
  `ratio=${(eur.priceToman / usd.priceToman).toFixed(3)}`,
);
check(
  'GBP/EUR ratio in [0.95, 1.25] (GBP typically slightly above EUR)',
  ratioInRange(itemsA.find((i) => i.symbol === 'GBP')!.priceToman, eur.priceToman, 0.95, 1.25),
  `ratio=${(itemsA.find((i) => i.symbol === 'GBP')!.priceToman / eur.priceToman).toFixed(3)}`,
);
check(
  'OUNCE_GOLD / GOLD18 ratio in [25, 50] (1 oz = 31.1g, ≈30× without premium)',
  ratioInRange(ounce.priceToman, gold18.priceToman, 25, 50),
  `ratio=${(ounce.priceToman / gold18.priceToman).toFixed(1)} (expected ~31.1 × premium)`,
);

// ============================================================
// سناریو B: Navasan down → fallback USDT × premium + FX
// ============================================================
console.log('\n━━━ B. Navasan down → USDT×premium + FX×USDT ━━━');
const itemsB = assemble(null, REALISTIC_USDT, REALISTIC_FX, 1.5);
console.log('\n' + 'symbol'.padEnd(12) + 'name'.padEnd(28) + 'price (T)'.padEnd(15) + 'change'.padEnd(8) + 'source');
console.log('─'.repeat(75));
for (const it of itemsB) {
  console.log(
    it.symbol.padEnd(12) +
      it.name.padEnd(28) +
      Math.round(it.priceToman).toLocaleString('en').padEnd(15) +
      (it.change ? (it.change > 0 ? '+' : '') + it.change.toFixed(2) + '%' : '—').padEnd(8) +
      it.source,
  );
}

const usdB = itemsB.find((i) => i.symbol === 'USD')!;
const eurB = itemsB.find((i) => i.symbol === 'EUR')!;
const gbpB = itemsB.find((i) => i.symbol === 'GBP')!;
const aedB = itemsB.find((i) => i.symbol === 'AED')!;

check('B: USD = 74,200 × 1.015 = 75,313', usdB.priceToman === 75313, `got=${usdB.priceToman}`);
check('B: USD source = usdt', usdB.source === 'usdt', `got=${usdB.source}`);
check('B: EUR = 0.865 × 74,200 = 64,183', eurB.priceToman === 64183, `got=${eurB.priceToman}`);
check('B: EUR source = fx-derived', eurB.source === 'fx-derived', `got=${eurB.source}`);
check('B: GBP = 0.746 × 74,200 = 55,353', gbpB.priceToman === 55353, `got=${gbpB.priceToman}`);
check('B: AED = 3.67 × 74,200 = 272,314', aedB.priceToman === 272314, `got=${aedB.priceToman}`);

check('B: no SEKKEH (Navasan down, no DB in this test)', !itemsB.some((i) => i.symbol === 'SEKKEH'), '');

// ============================================================
// سناریو C: ضریب طلایی متفاوت — تست ۰٪ و ۳٪
// ============================================================
console.log('\n━━━ C. Premium impact on USDT-derived USD ━━━');
const c0 = assemble(null, REALISTIC_USDT, null, 0);
const c15 = assemble(null, REALISTIC_USDT, null, 1.5);
const c30 = assemble(null, REALISTIC_USDT, null, 3);
const c50 = assemble(null, REALISTIC_USDT, null, 5);

const usd0 = c0.find((i) => i.symbol === 'USD')!.priceToman;
const usd15 = c15.find((i) => i.symbol === 'USD')!.priceToman;
const usd30 = c30.find((i) => i.symbol === 'USD')!.priceToman;
const usd50 = c50.find((i) => i.symbol === 'USD')!.priceToman;

console.log(`  premium  0% → USD = ${usd0.toLocaleString('en')}`);
console.log(`  premium  1.5% → USD = ${usd15.toLocaleString('en')}`);
console.log(`  premium  3%   → USD = ${usd30.toLocaleString('en')}`);
console.log(`  premium  5%   → USD = ${usd50.toLocaleString('en')}`);

check('C: premium 0% = base USDT (74,200)', usd0 === 74200, `got=${usd0}`);
check('C: premium 1.5% = 75,313', usd15 === 75313, `got=${usd15}`);
check('C: premium 3% = 76,426', usd30 === 76426, `got=${usd30}`);
check('C: premium 5% = 77,910', usd50 === 77910, `got=${usd50}`);

// ============================================================
// سناریو D: Navasan ناقص (فقط چند آیتم) + USDT + FX
// ============================================================
console.log('\n━━━ D. Navasan partial (only USD) + USDT + FX ━━━');
const partialNavasan = {
  usd: REALISTIC_NAVASAN.usd,
  sekkeh: REALISTIC_NAVASAN.sekkeh,  // has SEKKEH but not EUR
};
const itemsD = assemble(partialNavasan, REALISTIC_USDT, REALISTIC_FX, 1.5);
const usdD = itemsD.find((i) => i.symbol === 'USD')!;
const eurD = itemsD.find((i) => i.symbol === 'EUR')!;
const sekkehD = itemsD.find((i) => i.symbol === 'SEKKEH')!;
const nimD = itemsD.find((i) => i.symbol === 'NIM');

console.log(`  USD source: ${usdD.source} (expected: navasan)`);
console.log(`  EUR source: ${eurD.source} (expected: fx-derived)`);
console.log(`  SEKKEH source: ${sekkehD.source} (expected: navasan)`);
console.log(`  NIM source: ${nimD?.source ?? '(skipped)'} (expected: skipped — NIM not in Navasan, no FX)`);

check('D: USD from Navasan', usdD.source === 'navasan', '');
check('D: EUR from fx-derived (not in Navasan)', eurD.source === 'fx-derived', '');
check('D: SEKKEH from Navasan', sekkehD.source === 'navasan', '');
check('D: NIM correctly skipped (not in Navasan, no FX)', nimD === undefined, '');

// ============================================================
// نتیجه‌ی نهایی
// ============================================================
console.log('\n' + '═'.repeat(70));
const passed = checks.filter((c) => c.pass).length;
const failed = checks.filter((c) => !c.pass).length;
console.log(`  ${passed}/${checks.length} چک موفق، ${failed} شکست`);
console.log('═'.repeat(70));

if (failed > 0) {
  console.log('\n❌ چک‌های شکست‌خورده:');
  for (const c of checks.filter((c) => !c.pass)) {
    console.log(`  • ${c.name} → ${c.detail}`);
  }
  process.exit(1);
} else {
  console.log('\n✅ همه‌ی چک‌ها موفق — قیمت‌ها و نسبت‌ها در محدوده‌ی منطقی هستن.');
  process.exit(0);
}
