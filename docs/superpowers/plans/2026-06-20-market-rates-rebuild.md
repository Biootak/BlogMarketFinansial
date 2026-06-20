# Market Rates Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** بازسازی سیستم نرخ بازار (`MarketRatesTickerBar` + `ExchangeRate` + TGJU scraper) به یک **single source of truth** با واحدهای پولی صحیح (تومان/دلار/افغانی)، self-describing symbol ها، و discovery از TGJU برای ادمین.

**Architecture:**
1. **Schema-first**: ستون‌های جدید به `ExchangeRate` اضافه می‌شود (`symbol`, `unit`, `divisor`, `priority`, `group`, `provider`, `active`, `tgjuKey`).
2. **Registry**: نگاشت صریح ۲۲ ارز اصلی (ایران + افغان + جهانی) در `src/lib/market-rates/registry.ts`.
3. **Single source of truth**: `assembleMarketRates()` تنها جایی است که نرخ را می‌خواند/محاسبه می‌کند. هر UI (تیکر، `/money-transfer`) از آن مصرف می‌کند.
4. **Refresh cron** (هر ۶۰s): همه‌ی `provider='auto'` را از TGJU می‌خواند و در DB می‌نویسد. Stale value + badge "آفلاین" در صورت شکست.
5. **Discovery**: ادمین از dropdown **همه‌ی ۳۰۰ ارز TGJU** انتخاب می‌کند، auto-fill می‌شود، یا manual اضافه می‌کند.

**Tech Stack:** Next.js 16 + Prisma + PostgreSQL + TypeScript strict, Intl.NumberFormat('fa-IR'), Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-06-20-market-rates-rebuild-design.md`

---

## File Structure

### New files

```
src/lib/market-rates/
  ├── types.ts                 # MarketRateUnit, MarketRateGroup, MarketRateProvider, MarketRateItem
  ├── registry.ts              # SYMBOL_REGISTRY: 22 symbol اصلی
  ├── tgju.ts                  # (از src/lib/tgju.ts منتقل‌شده، فقط refactor)
  ├── usdt.ts                  # (جدا از exir-crypto-rates.ts)
  ├── fx.ts                    # (global FX rate fetcher)
  ├── discovery.ts             # discoverTgjuSymbols()
  ├── assembler.ts             # assembleMarketRates() — single source of truth
  ├── format.ts                # formatWithUnit, formatChangePercent
  └── index.ts                 # re-exports

src/actions/market-rates.ts    # Server Actions: getMarketRates, createMarketRate, etc.
src/app/api/market-rates/
  └── tgju-symbols/route.ts    # GET endpoint برای discovery
src/app/api/cron/refresh-market-rates/route.ts  # refresh cron
src/app/dashboard/exchange-rates/
  └── components/
      ├── DiscoveryDropdown.tsx
      └── RateForm.tsx

scripts/backfill-market-rates.mjs  # one-time migration script
```

### Modified files

```
prisma/schema.prisma                       # ExchangeRate extension
prisma/seed.js                             # seed 22 symbols از registry
src/app/(site)/(home)/designs/MarketRatesTickerBar.tsx  # مصرف MarketRateItem[]
src/app/(site)/(home)/SectionLargeSlider.tsx            # type جدید
src/app/dashboard/exchange-rates/page.tsx              # DiscoveryDropdown + RateForm
src/lib/freeMarketRates.ts                             # deprecate (تبدیل به re-export از market-rates/)
src/actions/market-rates.ts                            # (قبلاً بود، به‌روزرسانی با types جدید)
```

### Deprecated

```
src/lib/tgju.ts                    # منتقل می‌شود به src/lib/market-rates/tgju.ts
```

---

## Task Decomposition

این plan شامل ۱۲ task است که هر کدام یک واحد منطقی کامل است. ترتیب critical است — هر task به نتیجه‌ی task قبل وابسته است.

| # | Task | فایل‌ها |
|---|------|---------|
| 1 | Types + Registry (پایه‌ی همه) | `src/lib/market-rates/types.ts`, `registry.ts` |
| 2 | Format helpers | `src/lib/market-rates/format.ts` |
| 3 | Smoke برای registry + format | `scripts/smoke-market-rates.mjs` |
| 4 | Schema extension + migration | `prisma/schema.prisma` |
| 5 | Backfill script | `scripts/backfill-market-rates.mjs` |
| 6 | Seed | `prisma/seed.js` |
| 7 | TGJU/Exir/FX modules (extracted) | `src/lib/market-rates/{tgju,usdt,fx}.ts` |
| 8 | Assembler (single source of truth) | `src/lib/market-rates/assembler.ts` |
| 9 | Server Actions | `src/actions/market-rates.ts` |
| 10 | Discovery endpoint | `src/app/api/market-rates/tgju-symbols/route.ts` |
| 11 | Refresh cron | `src/app/api/cron/refresh-market-rates/route.ts` |
| 12 | Dashboard UI | `src/app/dashboard/exchange-rates/page.tsx`, `components/` |
| 13 | Ticker consumer | `MarketRatesTickerBar.tsx` |
| 14 | Verify + cleanup | `src/lib/freeMarketRates.ts`, smoke test کامل |

---

### Task 1: Types + Registry

**Files:**
- Create: `src/lib/market-rates/types.ts`
- Create: `src/lib/market-rates/registry.ts`

- [ ] **Step 1: ایجاد فایل types**

```ts
// src/lib/market-rates/types.ts

/** واحد پولی — خودش نمایش و ضریب تبدیل را تعیین می‌کند. */
export type MarketRateUnit =
  | 'toman'   // تومان ایران (نمایش داده می‌شود، raw value ÷ 10 از ریال)
  | 'rial'    // ریال خام (نمایش داده نمی‌شود، فقط ذخیره)
  | 'usd'     // دلار آمریکا
  | 'eur'     // یورو
  | 'afn'     // افغانی
  | 'pound';  // پوند طلا (placeholder، فعلاً استفاده نمی‌شود)

/** گروه‌بندی برای filter و نمایش. */
export type MarketRateGroup =
  | 'afghan'      // دلار هرات، افغانی
  | 'iran-forex'  // دلار، یورو، درهم، پوند، لیر (فارکس ایران)
  | 'iran-coin'   // سکه‌های ایرانی
  | 'iran-gold'   // طلای ایرانی
  | 'global'      // انس طلا، نفت (USD/oz)
  | 'minor';      // ین، روبل، روپیه

/** منبع داده. */
export type MarketRateProvider = 'auto' | 'manual';

/** یک آیتم نمایش — هر چیزی که UI نیاز دارد. */
export interface MarketRateItem {
  symbol: string;
  displayNameFa: string;
  group: MarketRateGroup;
  unit: MarketRateUnit;
  divisor: number;
  decimals: number;
  priority: number;
  value: number;
  changePercent: number;
  provider: MarketRateProvider;
  updatedAt: Date;
}

/** یک ردیف از registry (پیش‌تعریف‌شده، self-describing). */
export interface SymbolRegistryEntry {
  symbol: string;
  displayNameFa: string;
  tgjuKey?: string;
  group: MarketRateGroup;
  unit: MarketRateUnit;
  divisor: number;
  decimals: number;
  priority: number;
}
```

- [ ] **Step 2: ایجاد فایل registry**

```ts
// src/lib/market-rates/registry.ts

import type { SymbolRegistryEntry } from './types';

/**
 * SYMBOL_REGISTRY — نگاشت صریح symbol های اصلی.
 *
 * هر entry:
 *  - self-describing symbol (مثل IRAN_USD، نه USD)
 *  - نام فارسی برای نمایش
 *  - tgjuKey برای scraping (null = manual)
 *  - گروه برای filter
 *  - واحد نمایش + divisor + decimals
 *  - priority برای ترتیب در نوار (1 = اول)
 *
 * اگر ادمین ارزی خارج از این لیست اضافه کند، در DB ذخیره می‌شود
 * ولی در registry نیست. assembler هر دو را پشتیبانی می‌کند.
 */
export const SYMBOL_REGISTRY: SymbolRegistryEntry[] = [
  // ── Afghan (ویژه افغانستان) ─────────────────────────────────
  { symbol: 'AFGHANI_USD',  displayNameFa: 'دلار هرات',     group: 'afghan',     unit: 'toman', divisor: 10, decimals: 0, priority: 2 },
  { symbol: 'AFGHANI_AFN',  displayNameFa: 'افغانی',        group: 'afghan',     unit: 'toman', divisor: 10, decimals: 0, priority: 3 },

  // ── Iran Forex (ضروری) ──────────────────────────────────────
  { symbol: 'IRAN_USD',     displayNameFa: 'دلار تهران',    tgjuKey: 'price_dollar_rl', group: 'iran-forex', unit: 'toman', divisor: 10, decimals: 0, priority: 1 },
  { symbol: 'IRAN_EUR',     displayNameFa: 'یورو',          tgjuKey: 'price_eur',       group: 'iran-forex', unit: 'toman', divisor: 10, decimals: 0, priority: 7 },
  { symbol: 'IRAN_GBP',     displayNameFa: 'پوند انگلیس',   tgjuKey: 'price_gbp',       group: 'iran-forex', unit: 'toman', divisor: 10, decimals: 0, priority: 9 },
  { symbol: 'IRAN_AED',     displayNameFa: 'درهم امارات',   tgjuKey: 'price_aed',       group: 'iran-forex', unit: 'toman', divisor: 10, decimals: 0, priority: 8 },
  { symbol: 'IRAN_TRY',     displayNameFa: 'لیر ترکیه',     tgjuKey: 'price_try',       group: 'iran-forex', unit: 'toman', divisor: 10, decimals: 0, priority: 11 },
  { symbol: 'IRAN_CHF',     displayNameFa: 'فرانک سوئیس',   tgjuKey: 'price_chf',       group: 'iran-forex', unit: 'toman', divisor: 10, decimals: 0, priority: 17 },
  { symbol: 'IRAN_CAD',     displayNameFa: 'دلار کانادا',   tgjuKey: 'price_cad',       group: 'iran-forex', unit: 'toman', divisor: 10, decimals: 0, priority: 18 },
  { symbol: 'IRAN_AUD',     displayNameFa: 'دلار استرالیا', tgjuKey: 'price_aud',       group: 'iran-forex', unit: 'toman', divisor: 10, decimals: 0, priority: 19 },
  { symbol: 'IRAN_CNY',     displayNameFa: 'یوان چین',      tgjuKey: 'price_cny',       group: 'iran-forex', unit: 'toman', divisor: 10, decimals: 0, priority: 12 },
  { symbol: 'IRAN_JPY',     displayNameFa: 'ین ژاپن',       tgjuKey: 'price_jpy',       group: 'minor',      unit: 'toman', divisor: 10, decimals: 0, priority: 20 },
  { symbol: 'IRAN_RUB',     displayNameFa: 'روبل روسیه',    tgjuKey: 'price_rub',       group: 'minor',      unit: 'toman', divisor: 10, decimals: 0, priority: 21 },
  { symbol: 'IRAN_INR',     displayNameFa: 'روپیه هند',     tgjuKey: 'price_inr',       group: 'minor',      unit: 'toman', divisor: 10, decimals: 0, priority: 22 },

  // ── Iran Coin ───────────────────────────────────────────────
  { symbol: 'IRAN_COIN_EMAMI',   displayNameFa: 'سکه امامی',         tgjuKey: 'retail_sekee',   group: 'iran-coin',  unit: 'toman', divisor: 10, decimals: 0, priority: 4 },
  { symbol: 'IRAN_COIN_BAHAR',   displayNameFa: 'سکه بهار آزادی',   tgjuKey: 'retail_sekeb',   group: 'iran-coin',  unit: 'toman', divisor: 10, decimals: 0, priority: 10 },
  { symbol: 'IRAN_COIN_NIM',     displayNameFa: 'نیم سکه',           tgjuKey: 'retail_nim',     group: 'iran-coin',  unit: 'toman', divisor: 10, decimals: 0, priority: 13 },
  { symbol: 'IRAN_COIN_ROB',     displayNameFa: 'ربع سکه',           tgjuKey: 'retail_rob',     group: 'iran-coin',  unit: 'toman', divisor: 10, decimals: 0, priority: 14 },
  { symbol: 'IRAN_COIN_GERAMI',  displayNameFa: 'سکه گرمی',          tgjuKey: 'retail_gerami',  group: 'iran-coin',  unit: 'toman', divisor: 10, decimals: 0, priority: 15 },

  // ── Iran Gold ───────────────────────────────────────────────
  { symbol: 'IRAN_GOLD_18K',     displayNameFa: 'طلای ۱۸ عیار',      tgjuKey: 'geram18',        group: 'iran-gold',  unit: 'toman', divisor: 10, decimals: 0, priority: 5 },
  { symbol: 'IRAN_GOLD_MESGHAL', displayNameFa: 'مثقال طلا',         tgjuKey: 'mesghal',        group: 'iran-gold',  unit: 'toman', divisor: 10, decimals: 0, priority: 16 },

  // ── Global (دلار جهانی) ────────────────────────────────────
  { symbol: 'GLOBAL_OUNCE_GOLD', displayNameFa: 'انس طلا',           tgjuKey: 'ons',            group: 'global',     unit: 'usd',   divisor: 1,  decimals: 2, priority: 6 },
];

/** lookup map: symbol → entry */
export const SYMBOL_REGISTRY_MAP: ReadonlyMap<string, SymbolRegistryEntry> = new Map(
  SYMBOL_REGISTRY.map((e) => [e.symbol, e]),
);

/** lookup: TGJU key → symbol */
export const TGJU_KEY_TO_SYMBOL: ReadonlyMap<string, string> = new Map(
  SYMBOL_REGISTRY.filter((e) => e.tgjuKey).map((e) => [e.tgjuKey!, e.symbol]),
);

/** لیست symbol ها برای seed */
export const ALL_SYMBOLS: readonly string[] = SYMBOL_REGISTRY.map((e) => e.symbol);
```

- [ ] **Step 3: typecheck**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && npx tsc --noEmit
```

Expected: exit 0 (no errors).

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && git add src/lib/market-rates/ && git commit -m "feat(market-rates): add types and SYMBOL_REGISTRY (22 canonical symbols)

- types.ts: MarketRateUnit, MarketRateGroup, MarketRateProvider, MarketRateItem, SymbolRegistryEntry
- registry.ts: 22 self-describing symbols (IRAN_USD, AFGHANI_USD, GLOBAL_OUNCE_GOLD) with TGJU keys, group, unit, divisor, decimals, priority
- TGJU_KEY_TO_SYMBOL map for fast lookup during scraping
- ALL_SYMBOLS export for seed"
```

---

### Task 2: Format helpers

**Files:**
- Create: `src/lib/market-rates/format.ts`

- [ ] **Step 1: ایجاد فایل format**

```ts
// src/lib/market-rates/format.ts

import type { MarketRateUnit } from './types';

const UNIT_LABELS: Record<MarketRateUnit, string> = {
  toman: 'تومان',
  rial: 'ریال',
  usd: 'دلار',
  eur: 'یورو',
  afn: 'افغانی',
  pound: 'پوند',
};

/**
 * فرمت عدد + واحد پولی.
 * مثال: formatWithUnit(161500, 'toman', 0) → '۱۶۱,۵۰۰ تومان'
 * مثال: formatWithUnit(4160.26, 'usd', 2) → '۴,۱۶۰.۲۶ دلار'
 */
export function formatWithUnit(
  value: number,
  unit: MarketRateUnit,
  decimals: number,
): string {
  if (!Number.isFinite(value) || value <= 0) return '—';

  const formatted = new Intl.NumberFormat('fa-IR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

  return `${formatted} ${UNIT_LABELS[unit]}`;
}

/**
 * فرمت درصد تغییر (با علامت + یا −).
 * مثال: formatChangePercent(3.19) → '+۳.۱۹%'
 * مثال: formatChangePercent(-1.2) → '−۱.۲%'
 * مثال: formatChangePercent(0) → '۰.۰۰%'
 */
export function formatChangePercent(change: number): string {
  if (!Number.isFinite(change)) return '۰.۰۰%';
  const sign = change > 0 ? '+' : change < 0 ? '−' : '';
  const num = Math.abs(change).toFixed(2);
  // تبدیل ارقام ASCII به فارسی
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const numPersian = num.replace(/\d/g, (d) => persianDigits[Number.parseInt(d)]);
  return `${sign}${numPersian}%`;
}
```

- [ ] **Step 2: typecheck**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && git add src/lib/market-rates/format.ts && git commit -m "feat(market-rates): add format helpers (formatWithUnit, formatChangePercent)"
```

---

### Task 3: Smoke test برای registry و format

**Files:**
- Create: `scripts/smoke-market-rates.mjs`

- [ ] **Step 1: ایجاد اسکریپت smoke**

```js
// scripts/smoke-market-rates.mjs
// اجرا: node scripts/smoke-market-rates.mjs
// خروجی: PASS/FAIL برای هر assertion

import { SYMBOL_REGISTRY, TGJU_KEY_TO_SYMBOL, ALL_SYMBOLS } from '../src/lib/market-rates/registry.ts';
import { formatWithUnit, formatChangePercent } from '../src/lib/market-rates/format.ts';

let pass = 0, fail = 0;

function test(name, actual, expected) {
  if (actual === expected) {
    console.log('  ✓', name, '→', JSON.stringify(actual));
    pass++;
  } else {
    console.log('  ✗', name, '→ got', JSON.stringify(actual), 'expected', JSON.stringify(expected));
    fail++;
  }
}

console.log('=== Registry ===');
test('22 symbols', ALL_SYMBOLS.length, 22);
test('IRAN_USD priority', SYMBOL_REGISTRY.find((s) => s.symbol === 'IRAN_USD')?.priority, 1);
test('GLOBAL_OUNCE_GOLD unit', SYMBOL_REGISTRY.find((s) => s.symbol === 'GLOBAL_OUNCE_GOLD')?.unit, 'usd');
test('GLOBAL_OUNCE_GOLD divisor', SYMBOL_REGISTRY.find((s) => s.symbol === 'GLOBAL_OUNCE_GOLD')?.divisor, 1);
test('IRAN_USD divisor (rial/10)', SYMBOL_REGISTRY.find((s) => s.symbol === 'IRAN_USD')?.divisor, 10);
test('TGJU key lookup', TGJU_KEY_TO_SYMBOL.get('price_dollar_rl'), 'IRAN_USD');
test('TGJU key ons', TGJU_KEY_TO_SYMBOL.get('ons'), 'GLOBAL_OUNCE_GOLD');

console.log('=== formatWithUnit (probe values from 2026-06-20) ===');
test('USD 161,500 toman', formatWithUnit(161500, 'toman', 0), '۱۶۱,۵۰۰ تومان');
test('SEKKEH 167,990,000 toman', formatWithUnit(167990000, 'toman', 0), '۱۶۷,۹۹۰,۰۰۰ تومان');
test('GOLD18K 16,221,000 toman', formatWithUnit(16221000, 'toman', 0), '۱۶,۲۲۱,۰۰۰ تومان');
test('OUNCE 4,160.26 usd', formatWithUnit(4160.26, 'usd', 2), '۴,۱۶۰.۲۶ دلار');
test('EUR toman', formatWithUnit(1852300, 'toman', 0), '۱,۸۵۲,۳۰۰ تومان');
test('zero', formatWithUnit(0, 'toman', 0), '—');
test('NaN', formatWithUnit(NaN, 'toman', 0), '—');

console.log('=== formatChangePercent ===');
test('+3.19', formatChangePercent(3.19), '+۳.۱۹%');
test('-1.20', formatChangePercent(-1.2), '−۱.۲۰%');
test('0', formatChangePercent(0), '۰.۰۰%');
test('NaN', formatChangePercent(NaN), '۰.۰۰%');

console.log('');
console.log('Total:', pass, 'pass,', fail, 'fail');
process.exit(fail > 0 ? 1 : 0);
```

- [ ] **Step 2: اجرا**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && node --experimental-strip-types scripts/smoke-market-rates.mjs
```

Expected: خروجی شامل "Total: 19 pass, 0 fail" (یا تعداد مشابه).

اگر Node < 22 و `experimental-strip-types` کار نکرد، به‌جای آن از tsx استفاده کن:
```bash
npx tsx scripts/smoke-market-rates.mjs
```

- [ ] **Step 3: اگر fail بود، fix کن و دوباره اجرا کن تا همه pass شود.**

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && git add scripts/smoke-market-rates.mjs && git commit -m "test(market-rates): add smoke test for registry and format helpers"
```

---

### Task 4: Schema extension + migration

**Files:**
- Modify: `prisma/schema.prisma` (ExchangeRate)

- [ ] **Step 1: schema را بخوان**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && grep -n "model ExchangeRate" prisma/schema.prisma
```

- [ ] **Step 2: فیلدهای جدید اضافه کن**

`prisma/schema.prisma` — فقط مدل `ExchangeRate` را با این تغییرات به‌روز کن:

```prisma
model ExchangeRate {
  id          String   @id @default(cuid())
  name        String   @unique
  currency    String   // legacy: 'USD', 'EUR', 'SEKKEH' (deprecate نشده، برای backward compat)
  symbol      String?  @unique  // NEW: self-describing (e.g. 'IRAN_USD', 'AFGHANI_USD')
  displayNameFa String?           // NEW: 'دلار تهران' (اگر null، از 'name' استفاده شود)
  group       String?            // NEW: 'afghan' | 'iran-forex' | 'iran-coin' | 'iran-gold' | 'global' | 'minor'
  unit        String?            // NEW: 'toman' | 'usd' | 'eur' | 'afn'
  divisor     Int      @default(1)   // NEW: 10 for rial, 1 for others
  decimals    Int      @default(0)   // NEW
  priority    Int      @default(99)  // NEW: 1..99 (lower = first)
  provider    String   @default('auto')  // NEW: 'auto' | 'manual'
  tgjuKey     String?             // NEW: 'price_dollar_rl' (null for manual)
  active      Boolean  @default(true)   // NEW: hide from ticker without deleting

  rateType    RateType @default(BUY_SELL)
  buyRate     String?
  sellRate    String?
  singleRate  String?   // For manual provider: the current value
  bulkRate    String?
  description String?
  imageUrl    String?
  manualNote  String?   // Admin note (e.g. 'صرافی کابل - دستی')

  updatedAt   DateTime @updatedAt
  createdAt   DateTime @default(now())

  @@index([createdAt(sort: Desc)])
  @@index([active, priority])  // NEW: composite for ticker query
  @@index([symbol])            // NEW
}
```

- [ ] **Step 3: prisma generate**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && npx prisma generate
```

Expected: `✔ Generated Prisma Client (vX.X.X)`

- [ ] **Step 4: migration ایجاد کن**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && npx prisma migrate dev --name market_rate_registry_overhaul
```

Expected: یک migration جدید در `prisma/migrations/<timestamp>_market_rate_registry_overhaul/` ساخته می‌شود. سؤال "Are you sure you want to add the new columns?" ⇒ **y**.

اگر DATABASE_URL نداری و Prisma error داد:
```bash
npx prisma migrate dev --create-only --name market_rate_registry_overhaul
```
بعد migration را در حالت dry-run تأیید کن.

- [ ] **Step 5: typecheck**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && git add prisma/ && git commit -m "feat(market-rates): extend ExchangeRate with unit/divisor/priority/group/provider

- symbol: self-describing (e.g. IRAN_USD, AFGHANI_USD, GLOBAL_OUNCE_GOLD)
- displayNameFa: نام فارسی برای نمایش
- group, unit, divisor, decimals, priority: از SYMBOL_REGISTRY
- provider: 'auto' (TGJU/USDT) | 'manual' (ادمین)
- tgjuKey: کلید scrape از TGJU
- active: hide از ticker بدون حذف
- composite index (active, priority) برای query سریع
- همه‌ی ستون‌های جدید nullable/default ⇒ backward compat"
```

---

### Task 5: Backfill script

**Files:**
- Create: `scripts/backfill-market-rates.mjs`

- [ ] **Step 1: ایجاد script**

```js
// scripts/backfill-market-rates.mjs
// یک‌بار اجرا: node scripts/backfill-market-rates.mjs
// داده‌های فعلی ExchangeRate را از `currency` به `symbol` نگاشت می‌کند.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// نگاشت legacy currency → new symbol
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

// نگاشت legacy currency → default values (اگر در registry نبود)
const LEGACY_DEFAULTS = {
  group: 'iran-forex',
  unit: 'toman',
  divisor: 10,
  decimals: 0,
  priority: 50,
  provider: 'manual',  // legacy rows manual فرض می‌شوند مگر tgjuKey داشته باشند
};

async function main() {
  const rows = await prisma.exchangeRate.findMany();
  console.log('Found', rows.length, 'rows to backfill');

  let updated = 0, skipped = 0, noMapping = 0;
  for (const row of rows) {
    if (row.symbol) {
      skipped++;
      continue; // قبلاً backfill شده
    }

    const newSymbol = LEGACY_TO_SYMBOL[row.currency];
    if (!newSymbol) {
      console.warn('  ! no mapping for currency:', row.currency, '(row id:', row.id, ')');
      noMapping++;
      continue;
    }

    const isCoin = row.currency === 'SEKKEH' || row.currency === 'BAHAR' || row.currency === 'NIM' || row.currency === 'ROB' || row.currency === 'GERAMI';
    const isGold = row.currency === 'GOLD18' || row.currency === 'ABSHODEH';
    const isGlobal = row.currency === 'OUNCE_GOLD';

    const defaults = isCoin
      ? { group: 'iran-coin', unit: 'toman', divisor: 10, decimals: 0, priority: 50 }
      : isGold
        ? { group: 'iran-gold', unit: 'toman', divisor: 10, decimals: 0, priority: 50 }
        : isGlobal
          ? { group: 'global', unit: 'usd', divisor: 1, decimals: 2, priority: 6 }
          : { group: 'iran-forex', unit: 'toman', divisor: 10, decimals: 0, priority: 50 };

    // provider='auto' اگر tgjuKey می‌توانیم حدس بزنیم و هنوز manual rate ندارد
    const tgjuKey = ['price_dollar_rl', 'price_eur', 'retail_sekee'].find((k) => k.includes(row.currency.toLowerCase()));
    const provider = row.singleRate ? 'manual' : (tgjuKey ? 'auto' : 'manual');

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
          tgjuKey: provider === 'auto' ? tgjuKey : null,
          active: true,
        },
      });
      updated++;
    } catch (e) {
      console.error('  ✗ failed to update', row.id, e.message);
    }
  }

  console.log('Done. updated:', updated, 'skipped:', skipped, 'noMapping:', noMapping);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: dry-run (بدون تغییر DB)**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && DATABASE_URL="postgresql://invalid:invalid@localhost:5432/x" node scripts/backfill-market-rates.mjs 2>&1 | head -5
```

Expected: error مربوط به connection (نقشه‌ی import درست لود شد).

- [ ] **Step 3: Commit (اجرا در production در deploy جداگانه انجام می‌شود، نه الان)**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && git add scripts/backfill-market-rates.mjs && git commit -m "feat(market-rates): add backfill script (currency → symbol mapping)"
```

---

### Task 6: Seed

**Files:**
- Modify: `prisma/seed.js`

- [ ] **Step 1: seed فعلی را بررسی کن**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && grep -n "exchangeRate\|ExchangeRate" prisma/seed.js | head -20
```

- [ ] **Step 2: اگر ExchangeRate در seed هست، آن را با استفاده از SYMBOL_REGISTRY به‌روز کن. اگر نیست، بلوک زیر را اضافه کن:**

در `prisma/seed.js` (یا فایل seed مناسب) اضافه کن:

```js
// ── ExchangeRate seed از SYMBOL_REGISTRY ────────────────────────
// نکته: import path بستگی به build setup پروژه دارد.
// در Prisma seed معمولاً از require استفاده می‌شود.
// اگر TypeScript path alias کار نمی‌کند، مستقیماً literal بنویس.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// اگر نمی‌توان از TS path استفاده کرد، literal:
const SYMBOL_REGISTRY = [
  { symbol: 'AFGHANI_USD',  displayNameFa: 'دلار هرات',     group: 'afghan',     unit: 'toman', divisor: 10, decimals: 0, priority: 2 },
  { symbol: 'AFGHANI_AFN',  displayNameFa: 'افغانی',        group: 'afghan',     unit: 'toman', divisor: 10, decimals: 0, priority: 3 },
  { symbol: 'IRAN_USD',     displayNameFa: 'دلار تهران',    tgjuKey: 'price_dollar_rl', group: 'iran-forex', unit: 'toman', divisor: 10, decimals: 0, priority: 1 },
  { symbol: 'IRAN_EUR',     displayNameFa: 'یورو',          tgjuKey: 'price_eur',       group: 'iran-forex', unit: 'toman', divisor: 10, decimals: 0, priority: 7 },
  { symbol: 'IRAN_GBP',     displayNameFa: 'پوند انگلیس',   tgjuKey: 'price_gbp',       group: 'iran-forex', unit: 'toman', divisor: 10, decimals: 0, priority: 9 },
  { symbol: 'IRAN_AED',     displayNameFa: 'درهم امارات',   tgjuKey: 'price_aed',       group: 'iran-forex', unit: 'toman', divisor: 10, decimals: 0, priority: 8 },
  { symbol: 'IRAN_TRY',     displayNameFa: 'لیر ترکیه',     tgjuKey: 'price_try',       group: 'iran-forex', unit: 'toman', divisor: 10, decimals: 0, priority: 11 },
  { symbol: 'IRAN_CHF',     displayNameFa: 'فرانک سوئیس',   tgjuKey: 'price_chf',       group: 'iran-forex', unit: 'toman', divisor: 10, decimals: 0, priority: 17 },
  { symbol: 'IRAN_CAD',     displayNameFa: 'دلار کانادا',   tgjuKey: 'price_cad',       group: 'iran-forex', unit: 'toman', divisor: 10, decimals: 0, priority: 18 },
  { symbol: 'IRAN_AUD',     displayNameFa: 'دلار استرالیا', tgjuKey: 'price_aud',       group: 'iran-forex', unit: 'toman', divisor: 10, decimals: 0, priority: 19 },
  { symbol: 'IRAN_CNY',     displayNameFa: 'یوان چین',      tgjuKey: 'price_cny',       group: 'iran-forex', unit: 'toman', divisor: 10, decimals: 0, priority: 12 },
  { symbol: 'IRAN_JPY',     displayNameFa: 'ین ژاپن',       tgjuKey: 'price_jpy',       group: 'minor',      unit: 'toman', divisor: 10, decimals: 0, priority: 20 },
  { symbol: 'IRAN_RUB',     displayNameFa: 'روبل روسیه',    tgjuKey: 'price_rub',       group: 'minor',      unit: 'toman', divisor: 10, decimals: 0, priority: 21 },
  { symbol: 'IRAN_INR',     displayNameFa: 'روپیه هند',     tgjuKey: 'price_inr',       group: 'minor',      unit: 'toman', divisor: 10, decimals: 0, priority: 22 },
  { symbol: 'IRAN_COIN_EMAMI',   displayNameFa: 'سکه امامی',         tgjuKey: 'retail_sekee',   group: 'iran-coin',  unit: 'toman', divisor: 10, decimals: 0, priority: 4 },
  { symbol: 'IRAN_COIN_BAHAR',   displayNameFa: 'سکه بهار آزادی',   tgjuKey: 'retail_sekeb',   group: 'iran-coin',  unit: 'toman', divisor: 10, decimals: 0, priority: 10 },
  { symbol: 'IRAN_COIN_NIM',     displayNameFa: 'نیم سکه',           tgjuKey: 'retail_nim',     group: 'iran-coin',  unit: 'toman', divisor: 10, decimals: 0, priority: 13 },
  { symbol: 'IRAN_COIN_ROB',     displayNameFa: 'ربع سکه',           tgjuKey: 'retail_rob',     group: 'iran-coin',  unit: 'toman', divisor: 10, decimals: 0, priority: 14 },
  { symbol: 'IRAN_COIN_GERAMI',  displayNameFa: 'سکه گرمی',          tgjuKey: 'retail_gerami',  group: 'iran-coin',  unit: 'toman', divisor: 10, decimals: 0, priority: 15 },
  { symbol: 'IRAN_GOLD_18K',     displayNameFa: 'طلای ۱۸ عیار',      tgjuKey: 'geram18',        group: 'iran-gold',  unit: 'toman', divisor: 10, decimals: 0, priority: 5 },
  { symbol: 'IRAN_GOLD_MESGHAL', displayNameFa: 'مثقال طلا',         tgjuKey: 'mesghal',        group: 'iran-gold',  unit: 'toman', divisor: 10, decimals: 0, priority: 16 },
  { symbol: 'GLOBAL_OUNCE_GOLD', displayNameFa: 'انس طلا',           tgjuKey: 'ons',            group: 'global',     unit: 'usd',   divisor: 1,  decimals: 2, priority: 6 },
];

async function seedExchangeRates() {
  for (const entry of SYMBOL_REGISTRY) {
    await prisma.exchangeRate.upsert({
      where: { symbol: entry.symbol },
      update: {
        displayNameFa: entry.displayNameFa,
        group: entry.group,
        unit: entry.unit,
        divisor: entry.divisor,
        decimals: entry.decimals,
        priority: entry.priority,
        provider: 'auto',
        tgjuKey: entry.tgjuKey || null,
        active: true,
      },
      create: {
        symbol: entry.symbol,
        name: entry.displayNameFa, // legacy field
        currency: entry.symbol.replace('IRAN_', '').replace('AFGHANI_', '').replace('GLOBAL_', ''), // legacy
        displayNameFa: entry.displayNameFa,
        group: entry.group,
        unit: entry.unit,
        divisor: entry.divisor,
        decimals: entry.decimals,
        priority: entry.priority,
        provider: 'auto',
        tgjuKey: entry.tgjuKey || null,
        active: true,
        rateType: 'BUY_SELL',
      },
    });
  }
  console.log('  ✓ seeded', SYMBOL_REGISTRY.length, 'exchange rates');
}
```

این تابع را در `main()` فراخوانی کن.

- [ ] **Step 3: typecheck**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && git add prisma/seed.js && git commit -m "feat(market-rates): seed 22 canonical symbols from SYMBOL_REGISTRY"
```

---

### Task 7: TGJU/Exir/FX modules (extracted)

**Files:**
- Create: `src/lib/market-rates/tgju.ts`
- Create: `src/lib/market-rates/usdt.ts`
- Create: `src/lib/market-rates/fx.ts`

- [ ] **Step 1: tgju.ts را از فایل قدیمی کپی کن**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && cp src/lib/tgju.ts src/lib/market-rates/tgju.ts
```

سپس در `src/lib/market-rates/tgju.ts` مسیرهای import را به‌روز کن (اگر به فایل‌های دیگر وابسته است).

- [ ] **Step 2: usdt.ts را از exir جدا کن**

```ts
// src/lib/market-rates/usdt.ts
// فقط تابع getUsdtRate که در freeMarketRates.ts تعریف شده بود.

import { fetchCryptoTickerRates } from '@/actions/fetchCryptoTickerRates';

export interface UsdtRate {
  /** تومان (نه ریال) */
  toman: number;
  /** درصد تغییر */
  change: number;
}

export async function getUsdtRate(): Promise<UsdtRate | null> {
  try {
    const r = await fetchCryptoTickerRates();
    if (!r.success || !r.data) return null;
    const usdt = r.data.find((x) => x.symbol.toUpperCase() === 'USDT');
    if (!usdt) return null;
    const irr = usdt.irrPrice; // Exir: ریال
    if (!Number.isFinite(irr) || irr <= 0) return null;
    return { toman: irr / 10, change: usdt.change }; // Rial → Toman
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: fx.ts را ایجاد کن**

```ts
// src/lib/market-rates/fx.ts
// نرخ‌های جهانی FX از exchangerate-api.com (رایگان).

const EXR_BASE = 'https://api.exchangerate-api.com/v4/latest/USD';
const REQUEST_TIMEOUT_MS = 8_000;

export interface FxMap {
  [currency: string]: number;
}

export async function getGlobalFxRates(): Promise<FxMap | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(EXR_BASE, {
      method: 'GET',
      headers: { Accept: 'application/json', 'User-Agent': 'Biotak/1.0' },
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const json = (await res.json()) as { rates?: FxMap };
    return json?.rates ?? null;
  } catch {
    clearTimeout(t);
    return null;
  }
}
```

- [ ] **Step 4: typecheck**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && git add src/lib/market-rates/ && git commit -m "feat(market-rates): extract tgju/usdt/fx into separate modules"
```

---

### Task 8: Assembler (single source of truth)

**Files:**
- Create: `src/lib/market-rates/assembler.ts`
- Create: `src/lib/market-rates/index.ts`

- [ ] **Step 1: assembler.ts را ایجاد کن**

```ts
// src/lib/market-rates/assembler.ts
// تنها جایی که نرخ‌های بازار خوانده/محاسبه می‌شود.

import prisma from '@/lib/db';
import type {
  MarketRateItem,
  MarketRateGroup,
  MarketRateUnit,
  MarketRateProvider,
} from './types';
import { SYMBOL_REGISTRY_MAP } from './registry';
import { fetchTgjuLatest } from './tgju';
import { getUsdtRate } from './usdt';
import { getGlobalFxRates } from './fx';

function getUsdtPremiumPercent(): number {
  const raw = process.env.USDT_PREMIUM_PERCENT;
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 50) return 0;
  return n;
}

/**
 * assembleMarketRates — single source of truth.
 *
 * برای هر ExchangeRate فعال (active=true):
 *   1. provider='manual' → از singleRate
 *   2. provider='auto' + tgjuKey → از TGJU
 *   3. provider='auto' + symbol='IRAN_USD' + USDT موجود → از USDT × premium
 *   4. provider='auto' + USDT/FX موجود → از FX-derived
 *   5. هیچ‌کدام → null (در ticker نمایش داده نمی‌شود)
 *
 * خروجی: آرایه‌ی مرتب‌شده بر اساس priority.
 */
export async function assembleMarketRates(): Promise<MarketRateItem[]> {
  // منابع موازی
  const [dbRows, tgjuResult, usdt, fx] = await Promise.all([
    prisma.exchangeRate.findMany({
      where: { active: true },
      orderBy: { priority: 'asc' },
    }),
    fetchTgjuLatest(),
    getUsdtRate(),
    getGlobalFxRates(),
  ]);

  const tgjuMap = new Map<string, { value: number; change: number }>();
  if (tgjuResult.ok && tgjuResult.data) {
    for (const [k, v] of Object.entries(tgjuResult.data)) {
      tgjuMap.set(k, { value: v.value, change: v.change });
    }
  }

  const out: MarketRateItem[] = [];

  for (const row of dbRows) {
    const symbol = row.symbol ?? row.currency; // fallback برای legacy
    const registry = SYMBOL_REGISTRY_MAP.get(symbol);
    if (!registry) {
      // ادمین symbol سفارشی اضافه کرده ⇒ از فیلدهای DB بخوان
      const item = await assembleFromRow(row, tgjuMap, usdt, fx);
      if (item) out.push(item);
      continue;
    }

    const item = await assembleFromRow(row, tgjuMap, usdt, fx, registry);
    if (item) out.push(item);
  }

  return out;
}

async function assembleFromRow(
  row: Awaited<ReturnType<typeof prisma.exchangeRate.findMany>>[number],
  tgjuMap: Map<string, { value: number; change: number }>,
  usdt: Awaited<ReturnType<typeof getUsdtRate>>,
  fx: Awaited<ReturnType<typeof getGlobalFxRates>>,
  registry?: {
    symbol: string;
    displayNameFa: string;
    group: MarketRateGroup;
    unit: MarketRateUnit;
    divisor: number;
    decimals: number;
    priority: number;
    tgjuKey?: string;
  },
): Promise<MarketRateItem | null> {
  const symbol = row.symbol ?? row.currency;
  const displayNameFa = row.displayNameFa ?? row.name ?? symbol;
  const group = (row.group ?? registry?.group ?? 'iran-forex') as MarketRateGroup;
  const unit = (row.unit ?? registry?.unit ?? 'toman') as MarketRateUnit;
  const divisor = row.divisor ?? registry?.divisor ?? 10;
  const decimals = row.decimals ?? registry?.decimals ?? 0;
  const priority = row.priority ?? registry?.priority ?? 50;
  const provider = (row.provider ?? 'auto') as MarketRateProvider;
  const tgjuKey = row.tgjuKey ?? registry?.tgjuKey;

  let rawValue: number | null = null;
  let changePercent: number = 0;

  // Priority 1: manual
  if (provider === 'manual' && row.singleRate) {
    const v = Number.parseFloat(row.singleRate);
    if (Number.isFinite(v) && v > 0) rawValue = v * divisor; // singleRate به تومان/USD ذخیره می‌شود
  }

  // Priority 2: TGJU
  if (rawValue === null && tgjuKey && tgjuMap.has(tgjuKey)) {
    const t = tgjuMap.get(tgjuKey)!;
    rawValue = t.value; // ریال (÷ divisor در نهایت)
    changePercent = t.change;
  }

  // Priority 3: USDT-derived برای IRAN_USD
  if (rawValue === null && symbol === 'IRAN_USD' && usdt) {
    const premium = getUsdtPremiumPercent();
    rawValue = usdt.toman * (1 + premium / 100) * 10; // × 10 = ریال
    changePercent = usdt.change;
  }

  // Priority 4: FX-derived (برای سایر ارزها)
  if (rawValue === null && usdt && fx && symbol.startsWith('IRAN_')) {
    const fxCode = symbol.replace('IRAN_', '').slice(0, 3);
    const perUsd = fx[fxCode];
    if (perUsd && perUsd > 0) {
      rawValue = (usdt.toman / perUsd) * 10; // × 10 = ریال
    }
  }

  if (rawValue === null || !Number.isFinite(rawValue) || rawValue <= 0) {
    return null; // فیلتر می‌شود
  }

  // اعمال divisor (ریال → تومان)
  const value = rawValue / divisor;

  return {
    symbol,
    displayNameFa,
    group,
    unit,
    divisor,
    decimals,
    priority,
    value,
    changePercent,
    provider,
    updatedAt: row.updatedAt,
  };
}
```

- [ ] **Step 2: index.ts برای re-exports**

```ts
// src/lib/market-rates/index.ts
export * from './types';
export * from './registry';
export * from './format';
export { assembleMarketRates } from './assembler';
export { discoverTgjuSymbols } from './discovery';
```

(`discoverTgjuSymbols` در Task 10 ساخته می‌شود؛ فعلاً این خط را اضافه نکن تا آن task تکمیل شود.)

- [ ] **Step 3: typecheck**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && git add src/lib/market-rates/ && git commit -m "feat(market-rates): add assembleMarketRates (single source of truth)"
```

---

### Task 9: Server Actions

**Files:**
- Create: `src/actions/market-rates.ts` (یا modify اگر وجود دارد)

- [ ] **Step 1: فایل فعلی را بررسی کن**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && ls src/actions/market-rates.ts 2>&1 && head -50 src/actions/market-rates.ts 2>&1
```

- [ ] **Step 2: اگر وجود ندارد، ایجاد کن:**

```ts
// src/actions/market-rates.ts
'use server';

import { unstable_cache } from 'next/cache';
import { revalidateTag } from '@/lib/revalidate';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { assembleMarketRates } from '@/lib/market-rates';
import type { MarketRateItem } from '@/lib/market-rates';

const TAGS = {
  ticker: 'market-rates:ticker',
  exchangeRates: 'market-rates:list',
};

/** کش ۶۰ ثانیه‌ای برای assemble. */
export const getMarketRates = unstable_cache(
  async (): Promise<MarketRateItem[]> => {
    try {
      return await assembleMarketRates();
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[market-rates] assemble failed:', e);
      }
      return [];
    }
  },
  ['market-rates:v1'],
  {
    revalidate: 60,
    tags: [TAGS.ticker, TAGS.exchangeRates],
  },
);

/** لیست همه‌ی ExchangeRate برای داشبورد. */
export const getExchangeRateList = unstable_cache(
  async () => {
    return prisma.exchangeRate.findMany({
      orderBy: { priority: 'asc' },
    });
  },
  ['market-rates:list:v1'],
  {
    revalidate: 60,
    tags: [TAGS.exchangeRates],
  },
);

/** ادمین: اضافه کردن نرخ جدید. */
export async function createMarketRate(input: {
  symbol: string;
  displayNameFa: string;
  group: string;
  unit: string;
  divisor: number;
  decimals: number;
  priority: number;
  provider: 'auto' | 'manual';
  tgjuKey?: string;
  singleRate?: string;
  active?: boolean;
}): Promise<{ success: true; id: string } | { success: false; error: { code: string; message: string } }> {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN')) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی ندارید' } };
  }

  // Validate
  if (!input.symbol || !input.displayNameFa) {
    return { success: false, error: { code: 'INVALID_INPUT', message: 'symbol و displayNameFa الزامی هستند' } };
  }

  if (input.provider === 'manual' && (!input.singleRate || Number.parseFloat(input.singleRate) <= 0)) {
    return { success: false, error: { code: 'INVALID_INPUT', message: 'برای حالت دستی، singleRate الزامی است' } };
  }

  try {
    const created = await prisma.exchangeRate.create({
      data: {
        symbol: input.symbol,
        name: input.displayNameFa, // legacy
        currency: input.symbol, // legacy
        displayNameFa: input.displayNameFa,
        group: input.group,
        unit: input.unit,
        divisor: input.divisor,
        decimals: input.decimals,
        priority: input.priority,
        provider: input.provider,
        tgjuKey: input.tgjuKey || null,
        singleRate: input.singleRate || null,
        active: input.active ?? true,
        rateType: 'BUY_SELL',
      },
    });
    revalidateTag(TAGS.exchangeRates);
    revalidateTag(TAGS.ticker);
    return { success: true, id: created.id };
  } catch (e: any) {
    if (e.code === 'P2002') {
      return { success: false, error: { code: 'DUPLICATE', message: 'این symbol قبلاً ثبت شده' } };
    }
    return { success: false, error: { code: 'DB_ERROR', message: e.message ?? 'خطای دیتابیس' } };
  }
}

/** ادمین: به‌روزرسانی. */
export async function updateMarketRate(
  id: string,
  input: Partial<{
    displayNameFa: string;
    group: string;
    unit: string;
    divisor: number;
    decimals: number;
    priority: number;
    provider: 'auto' | 'manual';
    tgjuKey: string | null;
    singleRate: string | null;
    active: boolean;
  }>,
): Promise<{ success: true } | { success: false; error: { code: string; message: string } }> {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN')) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی ندارید' } };
  }

  try {
    await prisma.exchangeRate.update({
      where: { id },
      data: input,
    });
    revalidateTag(TAGS.exchangeRates);
    revalidateTag(TAGS.ticker);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: { code: 'DB_ERROR', message: e.message ?? 'خطای دیتابیس' } };
  }
}

/** ادمین: حذف. */
export async function deleteMarketRate(id: string): Promise<{ success: true } | { success: false; error: { code: string; message: string } }> {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN')) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی ندارید' } };
  }

  try {
    await prisma.exchangeRate.delete({ where: { id } });
    revalidateTag(TAGS.exchangeRates);
    revalidateTag(TAGS.ticker);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: { code: 'DB_ERROR', message: e.message ?? 'خطای دیتابیس' } };
  }
}
```

- [ ] **Step 3: typecheck**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && git add src/actions/market-rates.ts && git commit -m "feat(market-rates): add Server Actions (get/create/update/delete with auth)"
```

---

### Task 10: Discovery endpoint

**Files:**
- Create: `src/lib/market-rates/discovery.ts`
- Create: `src/app/api/market-rates/tgju-symbols/route.ts`

- [ ] **Step 1: discovery.ts**

```ts
// src/lib/market-rates/discovery.ts
// لیست همه‌ی symbol های موجود در TGJU homepage.

import { fetchTgjuLatest } from './tgju';
import { unstable_cache } from 'next/cache';

export interface TgjuSymbol {
  tgjuKey: string;
  displayNameFa: string;
  lastValue: number;
  lastChange: number;
}

/** لیست نمادهای TGJU با کش ۱ ساعته (TGJU خودش CDN cache 5min دارد). */
export const discoverTgjuSymbols = unstable_cache(
  async (): Promise<TgjuSymbol[]> => {
    const result = await fetchTgjuLatest();
    if (!result.ok || !result.data) return [];

    // HTML کامل را از cache می‌خوانیم ولی ما فقط key/value/change داریم.
    // برای نام فارسی، نیاز به re-parse HTML داریم — ولی در حال حاضر،
    // نام فارسی از SYMBOL_REGISTRY گرفته می‌شود و برای بقیه، TGJU_KEY
    // به‌عنوان شناسه استفاده می‌شود. در آینده می‌توان HTML را هم پارس کرد.

    const list: TgjuSymbol[] = [];
    for (const [key, v] of Object.entries(result.data)) {
      list.push({
        tgjuKey: key,
        displayNameFa: key, // fallback؛ در discovery UI بعداً refine می‌شود
        lastValue: v.value,
        lastChange: v.change,
      });
    }
    return list;
  },
  ['market-rates:tgju-symbols:v1'],
  { revalidate: 3600 },
);
```

- [ ] **Step 2: API route**

```ts
// src/app/api/market-rates/tgju-symbols/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { discoverTgjuSymbols } from '@/lib/market-rates/discovery';
import { TGJU_KEY_TO_SYMBOL } from '@/lib/market-rates/registry';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const symbols = await discoverTgjuSymbols();

  // enrich با symbol معادل (اگر در registry باشد)
  const enriched = symbols.map((s) => ({
    ...s,
    canonicalSymbol: TGJU_KEY_TO_SYMBOL.get(s.tgjuKey) ?? null,
  }));

  return NextResponse.json({ success: true, data: enriched });
}
```

- [ ] **Step 3: typecheck**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && npx tsc --noEmit
```

- [ ] **Step 4: index.ts را به‌روز کن (اضافه کردن discoverTgjuSymbols)**

در `src/lib/market-rates/index.ts`:
```ts
export * from './types';
export * from './registry';
export * from './format';
export { assembleMarketRates } from './assembler';
export { discoverTgjuSymbols, type TgjuSymbol } from './discovery';
```

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && git add src/lib/market-rates/ src/app/api/market-rates/ && git commit -m "feat(market-rates): add discovery endpoint (TGJU symbols for admin)"
```

---

### Task 11: Refresh cron

**Files:**
- Create: `src/app/api/cron/refresh-market-rates/route.ts`

- [ ] **Step 1: route ایجاد کن**

```ts
// src/app/api/cron/refresh-market-rates/route.ts
import { NextResponse } from 'next/server';
import { revalidateTag } from '@/lib/revalidate';
import prisma from '@/lib/db';
import { fetchTgjuLatest } from '@/lib/market-rates/tgju';
import { getUsdtRate } from '@/lib/market-rates/usdt';
import { getGlobalFxRates } from '@/lib/market-rates/fx';

const TAGS = {
  ticker: 'market-rates:ticker',
  exchangeRates: 'market-rates:list',
};

function getUsdtPremiumPercent(): number {
  const raw = process.env.USDT_PREMIUM_PERCENT;
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 50) return 0;
  return n;
}

/**
 * POST /api/cron/refresh-market-rates
 * Auth: Bearer CRON_SECRET یا ?secret=
 * هر ۶۰s فراخوانی می‌شود.
 */
export async function POST(req: Request) {
  // auth
  const auth = req.headers.get('authorization');
  const url = new URL(req.url);
  const secret = auth?.replace(/^Bearer\s+/i, '') || url.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const [tgjuResult, usdt, fx, autoRows] = await Promise.all([
    fetchTgjuLatest(),
    getUsdtRate(),
    getGlobalFxRates(),
    prisma.exchangeRate.findMany({
      where: { active: true, provider: 'auto' },
    }),
  ]);

  if (!tgjuResult.ok && !usdt && !fx) {
    return NextResponse.json(
      { error: 'ALL_SOURCES_FAILED', detail: 'TGJU + USDT + FX failed; DB unchanged' },
      { status: 502 },
    );
  }

  const tgjuMap = tgjuResult.ok && tgjuResult.data
    ? new Map(Object.entries(tgjuResult.data).map(([k, v]) => [k, { value: v.value, change: v.change }]))
    : new Map();

  let updated = 0, skipped = 0;
  const errors: { symbol: string; reason: string }[] = [];

  for (const row of autoRows) {
    let rawValue: number | null = null;
    let changePercent: number = 0;

    if (row.tgjuKey && tgjuMap.has(row.tgjuKey)) {
      const t = tgjuMap.get(row.tgjuKey)!;
      rawValue = t.value;
      changePercent = t.change;
    } else if (row.symbol === 'IRAN_USD' && usdt) {
      const premium = getUsdtPremiumPercent();
      rawValue = usdt.toman * (1 + premium / 100) * 10; // × 10 = ریال
      changePercent = usdt.change;
    } else if (usdt && fx && row.symbol?.startsWith('IRAN_')) {
      const fxCode = row.symbol.replace('IRAN_', '').slice(0, 3);
      const perUsd = fx[fxCode];
      if (perUsd && perUsd > 0) {
        rawValue = (usdt.toman / perUsd) * 10;
      }
    }

    if (rawValue === null || !Number.isFinite(rawValue) || rawValue <= 0) {
      skipped++;
      errors.push({ symbol: row.symbol ?? row.currency, reason: 'no data from any source' });
      continue;
    }

    // store as ریال (÷ divisor برای تومان)
    const rateForDb = rawValue; // ریال
    try {
      await prisma.exchangeRate.update({
        where: { id: row.id },
        data: {
          singleRate: rateForDb.toString(),
          // store change in description یا یک ستون جدید (در آینده)
        },
      });
      updated++;
    } catch (e: any) {
      errors.push({ symbol: row.symbol ?? row.currency, reason: e.message });
    }
  }

  revalidateTag(TAGS.ticker);
  revalidateTag(TAGS.exchangeRates);

  return NextResponse.json({
    success: true,
    data: { updated, skipped, errors, total: autoRows.length, tgjuOk: tgjuResult.ok, usdtOk: !!usdt, fxOk: !!fx },
  });
}

export async function GET() {
  return NextResponse.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
}
```

- [ ] **Step 2: typecheck**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && git add src/app/api/cron/refresh-market-rates/ && git commit -m "feat(market-rates): add refresh cron (60s, updates auto provider rows)"
```

---

### Task 12: Dashboard UI

**Files:**
- Modify: `src/app/dashboard/exchange-rates/page.tsx`
- Create: `src/app/dashboard/exchange-rates/components/DiscoveryDropdown.tsx`
- Create: `src/app/dashboard/exchange-rates/components/RateForm.tsx`

- [ ] **Step 1: page فعلی را بررسی کن**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && head -100 src/app/dashboard/exchange-rates/page.tsx
```

- [ ] **Step 2: DiscoveryDropdown.tsx**

```tsx
// src/app/dashboard/exchange-rates/components/DiscoveryDropdown.tsx
'use client';

import { useEffect, useState } from 'react';
import type { TgjuSymbol } from '@/lib/market-rates/discovery';

interface Props {
  onSelect: (symbol: TgjuSymbol) => void;
}

export default function DiscoveryDropdown({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [symbols, setSymbols] = useState<TgjuSymbol[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/market-rates/tgju-symbols')
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setSymbols(j.data);
      })
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = symbols.filter((s) => {
    const q = query.toLowerCase();
    return s.tgjuKey.toLowerCase().includes(q) || s.displayNameFa.toLowerCase().includes(q);
  });

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="جستجو در نرخ‌های TGJU…"
        className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900"
      />
      {open && (
        <div className="absolute z-10 w-full mt-1 max-h-80 overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg">
          {loading ? (
            <div className="p-4 text-center text-neutral-500">در حال بارگذاری…</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-neutral-500">نتیجه‌ای یافت نشد</div>
          ) : (
            filtered.map((s) => (
              <button
                key={s.tgjuKey}
                type="button"
                onClick={() => {
                  onSelect(s);
                  setOpen(false);
                  setQuery('');
                }}
                className="w-full text-right px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between gap-2"
              >
                <span className="text-sm">{s.displayNameFa || s.tgjuKey}</span>
                <span className="text-xs text-neutral-500 font-mono">{s.tgjuKey}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: RateForm.tsx**

```tsx
// src/app/dashboard/exchange-rates/components/RateForm.tsx
'use client';

import { useState } from 'react';
import { createMarketRate } from '@/actions/market-rates';
import DiscoveryDropdown from './DiscoveryDropdown';
import type { TgjuSymbol } from '@/lib/market-rates/discovery';
import { SYMBOL_REGISTRY } from '@/lib/market-rates/registry';

const GROUPS = ['afghan', 'iran-forex', 'iran-coin', 'iran-gold', 'global', 'minor'] as const;
const UNITS = ['toman', 'usd', 'eur', 'afn'] as const;

export default function RateForm() {
  const [form, setForm] = useState({
    symbol: '',
    displayNameFa: '',
    group: 'iran-forex' as (typeof GROUPS)[number],
    unit: 'toman' as (typeof UNITS)[number],
    divisor: 10,
    decimals: 0,
    priority: 50,
    provider: 'auto' as 'auto' | 'manual',
    tgjuKey: '',
    singleRate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleDiscoverySelect = (s: TgjuSymbol) => {
    const matched = SYMBOL_REGISTRY.find((r) => r.tgjuKey === s.tgjuKey);
    if (matched) {
      setForm({
        symbol: matched.symbol,
        displayNameFa: matched.displayNameFa,
        group: matched.group,
        unit: matched.unit,
        divisor: matched.divisor,
        decimals: matched.decimals,
        priority: matched.priority,
        provider: 'auto',
        tgjuKey: matched.tgjuKey ?? '',
        singleRate: '',
      });
    } else {
      // نماد در registry نیست ⇒ ادمین باید بقیه را پر کند
      setForm((f) => ({
        ...f,
        symbol: `CUSTOM_${s.tgjuKey.toUpperCase()}`,
        displayNameFa: s.displayNameFa || s.tgjuKey,
        tgjuKey: s.tgjuKey,
        provider: 'auto',
        divisor: 1,
        unit: 'usd',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const result = await createMarketRate({
      ...form,
      singleRate: form.provider === 'manual' ? form.singleRate : undefined,
    });

    setLoading(false);
    if (result.success) {
      setSuccess('نرخ با موفقیت اضافه شد');
      setForm({
        symbol: '', displayNameFa: '', group: 'iran-forex', unit: 'toman',
        divisor: 10, decimals: 0, priority: 50, provider: 'auto', tgjuKey: '', singleRate: '',
      });
    } else {
      setError(result.error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
      <h3 className="text-lg font-bold">افزودن نرخ جدید</h3>

      <div>
        <label className="block text-sm font-medium mb-1">Discovery از TGJU (اختیاری)</label>
        <DiscoveryDropdown onSelect={handleDiscoverySelect} />
        <p className="text-xs text-neutral-500 mt-1">
          اگر نماد در لیست نیست، فیلدهای زیر را دستی پر کنید.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Symbol</label>
          <input
            value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value })}
            required
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">نام فارسی</label>
          <input
            value={form.displayNameFa}
            onChange={(e) => setForm({ ...form, displayNameFa: e.target.value })}
            required
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">گروه</label>
          <select
            value={form.group}
            onChange={(e) => setForm({ ...form, group: e.target.value as any })}
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-900"
          >
            {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">واحد</label>
          <select
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value as any })}
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-900"
          >
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Divisor</label>
          <input
            type="number"
            value={form.divisor}
            onChange={(e) => setForm({ ...form, divisor: Number(e.target.value) })}
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">اولویت</label>
          <input
            type="number"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">منبع</label>
          <select
            value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value as 'auto' | 'manual' })}
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-900"
          >
            <option value="auto">خودکار (TGJU)</option>
            <option value="manual">دستی</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">TGJU Key (اگر auto)</label>
          <input
            value={form.tgjuKey}
            onChange={(e) => setForm({ ...form, tgjuKey: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-900 font-mono text-sm"
            placeholder="price_dollar_rl"
          />
        </div>
        {form.provider === 'manual' && (
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">مقدار دستی ({form.unit})</label>
            <input
              type="number"
              step="any"
              value={form.singleRate}
              onChange={(e) => setForm({ ...form, singleRate: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-900"
            />
          </div>
        )}
      </div>

      {error && <p className="text-rose-600 text-sm">{error}</p>}
      {success && <p className="text-emerald-600 text-sm">{success}</p>}

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? 'در حال ذخیره…' : 'ذخیره'}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: page.tsx را modify کن**

```tsx
// src/app/dashboard/exchange-rates/page.tsx
import { getExchangeRateList } from '@/actions/market-rates';
import { formatWithUnit, formatChangePercent } from '@/lib/market-rates/format';
import RateForm from './components/RateForm';

export const dynamic = 'force-dynamic';

export default async function ExchangeRatesPage() {
  const rows = await getExchangeRateList();

  return (
    <div className="container py-8 space-y-8">
      <h1 className="text-2xl font-bold">مدیریت نرخ‌های بازار</h1>

      <RateForm />

      <div>
        <h2 className="text-xl font-bold mb-4">نرخ‌های فعلی</h2>
        <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-3 py-2 text-right">اولویت</th>
                <th className="px-3 py-2 text-right">نام</th>
                <th className="px-3 py-2 text-right">Symbol</th>
                <th className="px-3 py-2 text-right">گروه</th>
                <th className="px-3 py-2 text-right">واحد</th>
                <th className="px-3 py-2 text-right">مقدار</th>
                <th className="px-3 py-2 text-right">تغییر</th>
                <th className="px-3 py-2 text-right">منبع</th>
                <th className="px-3 py-2 text-right">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const value = r.singleRate ? Number.parseFloat(r.singleRate) / (r.divisor || 1) : null;
                return (
                  <tr key={r.id} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-3 py-2">{r.priority}</td>
                    <td className="px-3 py-2 font-medium">{r.displayNameFa ?? r.name}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.symbol ?? r.currency}</td>
                    <td className="px-3 py-2">{r.group ?? '—'}</td>
                    <td className="px-3 py-2">{r.unit ?? '—'}</td>
                    <td className="px-3 py-2 tabular-nums" dir="ltr">
                      {value !== null && r.unit
                        ? formatWithUnit(value, r.unit as any, r.decimals)
                        : '—'}
                    </td>
                    <td className="px-3 py-2" dir="ltr">—</td>
                    <td className="px-3 py-2">{r.provider}</td>
                    <td className="px-3 py-2">…</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: typecheck + build**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && npx tsc --noEmit && npm run build 2>&1 | tail -10
```

Expected: build success (یا pre-existing Prisma errors که قبل از تغییرات ما هم بودند).

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && git add src/app/dashboard/exchange-rates/ && git commit -m "feat(market-rates): dashboard UI with DiscoveryDropdown and RateForm"
```

---

### Task 13: Ticker consumer

**Files:**
- Modify: `src/app/(site)/(home)/designs/MarketRatesTickerBar.tsx`
- Modify: `src/app/(site)/(home)/SectionLargeSlider.tsx`

- [ ] **Step 1: MarketRatesTickerBar.tsx را بازسازی کن**

```tsx
// src/app/(site)/(home)/designs/MarketRatesTickerBar.tsx
'use client';

import type { MarketRateItem } from '@/lib/market-rates';
import { InfiniteTicker } from '@/components/InfiniteTicker';
import { TickerShell } from '@/components/TickerShell';
import { TrendingUp, TrendingDown, Minus, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatWithUnit, formatChangePercent } from '@/lib/market-rates/format';

interface Props {
  rates: MarketRateItem[];
  label?: string;
}

export default function MarketRatesTickerBar({ rates, label = 'بازارها' }: Props) {
  if (!rates || rates.length === 0) return null;

  // InfiniteTicker خودش ۲ کپی می‌سازد — duplicate نکن
  const items = rates;

  return (
    <TickerShell
      height="md"
      fadeSize="md"
      tone="glass"
      ariaLabel="نرخ‌های بازار"
      showLiveDot
      lead={
        <span className="flex items-center gap-1.5">
          <Radio className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">زنده</span>
        </span>
      }
    >
      <InfiniteTicker duration={60} dir="rtl" pauseOnHover pauseOnHold>
        <div className="flex items-stretch">
          {items.map((rate, idx) => {
            const hasChange = Number.isFinite(rate.changePercent);
            const isPositive = hasChange && rate.changePercent > 0;
            const isNegative = hasChange && rate.changePercent < 0;
            const isLast = idx === items.length - 1;
            const changeColor = isPositive
              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/10'
              : isNegative
                ? 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-500/10'
                : 'text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/60';
            return (
              <div
                key={rate.symbol}
                className={cn(
                  'flex items-center gap-2 px-3 sm:px-4 py-2 shrink-0',
                  !isLast && 'border-l border-neutral-200/70 dark:border-l-neutral-800/70',
                )}
              >
                <span className="text-[12px] sm:text-[13px] font-bold text-neutral-900 dark:text-neutral-100">
                  {rate.displayNameFa}
                </span>
                <span dir="ltr" className="text-[11px] sm:text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 tabular-nums">
                  {formatWithUnit(rate.value, rate.unit, rate.decimals)}
                </span>
                {hasChange && rate.changePercent !== 0 && (
                  <span
                    className={cn(
                      'flex items-center gap-0.5 text-[10px] sm:text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-md',
                      changeColor,
                    )}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    ) : (
                      <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    )}
                    <span dir="ltr" className="inline-block">
                      {formatChangePercent(rate.changePercent)}
                    </span>
                  </span>
                )}
                {hasChange && rate.changePercent === 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] sm:text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-md text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/60">
                    <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span dir="ltr" className="inline-block">
                      {formatChangePercent(0)}
                    </span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </InfiniteTicker>
    </TickerShell>
  );
}
```

- [ ] **Step 2: SectionLargeSlider.tsx را به‌روز کن**

```tsx
// src/app/(site)/(home)/SectionLargeSlider.tsx
import { fetchCryptoTickerRates } from '@/actions/fetchCryptoTickerRates';
import { getFeaturedPosts } from '@/actions/getFeaturedPosts';
import { getMarketRates } from '@/actions/market-rates';
import { getRateLists } from '@/actions/rate-lists';
import Empty from '@/components/Empty';
import type { PostWithRelations, RateListData } from '@/types/types';
import { cache } from 'react';
import DeferredDesign7 from './deferred/DeferredDesign7';

const getFeaturedPostsCached = cache(getFeaturedPosts);
const getCryptoTickerRatesCached = cache(fetchCryptoTickerRates);
const getMarketRatesCached = cache(getMarketRates);
const getRateListsCached = cache(getRateLists);

export default async function SectionLargeSlider() {
  const [postsResult, ratesResult, marketRates, rateLists] = await Promise.all([
    getFeaturedPostsCached(3),
    getCryptoTickerRatesCached(),
    getMarketRatesCached(),
    getRateListsCached(),
  ]);

  if (postsResult.error) {
    console.error('Error fetching featured posts:', postsResult.error);
    return <Empty />;
  }
  if (!postsResult.data || postsResult.data.length === 0) {
    return <Empty />;
  }

  const activeRateLists: RateListData[] = rateLists.filter((l: RateListData) => l.isActive);

  return (
    <div>
      <DeferredDesign7
        initialPosts={postsResult.data}
        rates={ratesResult.success ? ratesResult.data : undefined}
        marketRates={marketRates}
        rateLists={activeRateLists}
        className="pt-4 pb-3 md:py-5 lg:pt-5"
      />
    </div>
  );
}
```

- [ ] **Step 3: typecheck + build**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && npx tsc --noEmit && npm run build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && git add src/app/\(site\)/\(home\)/designs/MarketRatesTickerBar.tsx src/app/\(site\)/\(home\)/SectionLargeSlider.tsx && git commit -m "feat(ticker): consume MarketRateItem[] from single source of truth

- استفاده از getMarketRates به جای getFreeMarketRates
- formatWithUnit + formatChangePercent از market-rates
- نام فارسی از displayNameFa به جای symbol
- pill خاکستری برای change=0
- span dir='ltr' برای BiDi ایمن"
```

---

### Task 14: Verify + cleanup

**Files:**
- Modify: `src/lib/freeMarketRates.ts` (deprecate)
- Modify: هر مصرف‌کننده‌ای که هنوز از `getFreeMarketRates` استفاده می‌کند

- [ ] **Step 1: جستجو برای مصرف‌کننده‌های قدیمی**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && grep -rn "getFreeMarketRates\|freeMarketRates" src/ --include="*.ts" --include="*.tsx" | head -20
```

- [ ] **Step 2: همه را به `getMarketRates` تغییر بده**

برای هر فایل پیدا‌شده:
- Import: `import { getFreeMarketRates } from '@/actions/market-rates';` → `import { getMarketRates } from '@/actions/market-rates';`
- فراخوانی: `getFreeMarketRates()` → `getMarketRates()`

- [ ] **Step 3: src/lib/freeMarketRates.ts را deprecate کن**

```ts
// src/lib/freeMarketRates.ts
/**
 * @deprecated این فایل منتقل شد به src/lib/market-rates/.
 * استفاده از getMarketRates از '@/actions/market-rates'.
 */
export { getFreeMarketRates as getFreeMarketRatesLegacy } from '@/lib/market-rates/assembler';
// actual re-export
```

(ساده‌تر: re-export از `assembler.ts`. یا حذف کامل و اصلاح همه‌ی import ها.)

- [ ] **Step 4: smoke test کامل**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && node --experimental-strip-types scripts/smoke-market-rates.mjs
```

Expected: همه pass.

- [ ] **Step 5: build نهایی**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && npm run build 2>&1 | tail -15
```

Expected: "Compiled successfully" (یا pre-existing Prisma errors).

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/Biotak/Desktop/FinancialMarket" && git add -A && git commit -m "refactor(market-rates): deprecate freeMarketRates, unify on assembleMarketRates

- همه‌ی مصرف‌کننده‌ها به getMarketRates مهاجرت کردند
- src/lib/freeMarketRates.ts deprecate شد
- smoke test همه‌ی assertion ها pass می‌شود
- build موفق"
```

---

## Verification Checklist

- [ ] همه‌ی ۱۴ task commit شدند
- [ ] `npx tsc --noEmit` exit 0
- [ ] `npm run build` موفق
- [ ] `node scripts/smoke-market-rates.mjs` همه pass
- [ ] در dev:
  - [ ] `/` (هوم) — تیکر نرخ‌های صحیح نمایش دهد (تومان/دلار)
  - [ ] `/dashboard/exchange-rates` — discovery dropdown کار کند
  - [ ] ادمین یک نرخ جدید اضافه کند → در تیکر نمایش داده شود
  - [ ] در `/money-transfer` و تیکر، **یک نرخ** برای هر symbol
- [ ] BiDi: اعداد در `<span dir="ltr">` در RTL معکوس نمی‌شوند
- [ ] backfill script روی production اجرا شد
- [ ] refresh cron در Vercel Cron / external تنظیم شد
