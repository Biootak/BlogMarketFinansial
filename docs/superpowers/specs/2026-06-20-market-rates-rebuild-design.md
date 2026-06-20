# طراحی: بازسازی سیستم Market Rates Ticker (واحدهای پولی + Registry + Discovery)

- **تاریخ**: ۲۰۲۶-۰۶-۲۰
- **نویسنده**: ZCode (brainstorming)
- **وضعیت**: Approved (در انتظار implementation plan)
- **ادامه‌ی**: `2026-06-20-ticker-manual-icon-design.md` (manual override + icons + Afghan slot) — این سند آن را با لایه‌ی واحد پولی و registry ادغام می‌کند.

---

## ۱. زمینه و مسئله

نوار نرخ بالای اسلایدر اصلی (`MarketRatesTickerBar` در `src/app/(site)/(home)/designs/`) در حال حاضر چند مشکل ساختاری دارد که در طول debugging سال ۲۰۲۶-۰۶-۲۰ شناسایی شد:

### ۱.۱. باگ ریشه‌ای: واحد پولی

TGJU همه‌ی نرخ‌های خود را به **ریال** برمی‌گرداند (نه تومان). مستند فعلی `src/lib/tgju.ts:18-19` ادعا می‌کند «value به تومان»، ولی probe زنده‌ی امروز تأیید کرد:

| کلید TGJU | مقدار خام | واحد واقعی | آنچه باید نمایش داده شود |
|------------|-----------|-------------|---------------------------|
| `price_dollar_rl` | 1,615,000 | **ریال** | ۱۶۱,۵۰۰ تومان |
| `retail_sekee` | 1,679,900,000 | **ریال** | ۱۶۷,۹۹۰,۰۰۰ تومان |
| `geram18` | 162,210,000 | **ریال** | ۱۶,۲۲۱,۰۰۰ تومان |
| `ons` | 4,160.26 | **دلار جهانی** (USD/oz) | ۴,۱۶۰.۲۶ دلار |

الان کد عدد ریال را مستقیماً به‌عنوان تومان نمایش می‌دهد ⇒ کاربر فکر می‌کند سکه ۱,۶۷۹,۹۰۰,۰۰۰ تومان است (در حالی که واقعاً ۱۶۷,۹۹۰,۰۰۰ تومان است — ۱۰ برابر بیشتر).

### ۱.۲. نام‌گذاری گیج‌کننده

- `freeMarketRates.ts` چند بار rename شده (`getMarketRates` → `getFreeMarketRates`)؛ کش v4-renamed
- `WANTED_CANONICAL` مفهوم نامشخصی دارد
- `MarketSource = 'tgju' | 'usdt' | 'fx-derived' | 'db'` — نام نمی‌گوید اولویت چیست
- `MarketRateItem` (action) ≠ `FreeMarketItem` (lib) — دو type برای یک مفهوم
- `BAHAR` در لیست اصلی ولی `TGJU_KEY['BAHAR']` تعریف نشده
- `BAHAR` در `DISPLAY_NAMES` ولی نه در `TGJU_KEY`

### ۱.۳. محدودیت افزودن ارز

ادمین نمی‌تواند ارزی خارج از `WANTED_CANONICAL` اضافه کند. فقط نرخ‌های از‌پیش‌تعریف‌شده قابل نمایش هستند. spec قبلی (`ticker-manual-icon-design.md`) `manualRate` را برای `ExchangeRate` پیشنهاد کرده بود، ولی:
- ارز جدید از **TGJU** نمی‌تواند اضافه شود (فقط دستی)
- نام symbol در فرم به‌صورت آزاد وارد می‌شود ⇒ احتمال تکرار و خطا
- discovery از symbol های موجود در TGJU وجود ندارد

### ۱.۴. «دو نرخ متفاوت از یک ارز»

اگر ادمین برای «دلار» نرخ دستی در `ExchangeRate` وارد کند:
- `/money-transfer` نرخ دستی نشان می‌دهد
- `MarketRatesTickerBar` نرخ TGJU نشان می‌دهد
- کاربر دو قیمت متفاوت برای یک ارز می‌بیند ⇒ سردرگمی

---

## ۲. اهداف

1. **واحد پولی صحیح:** همه‌ی نرخ‌ها با واحد درست نمایش داده شوند. تومان برای ریال÷۱۰، دلار برای انس/نفت.
2. **self-describing symbols:** نام symbol ها خودشان مفهوم را برسانند (مثل `IRAN_COIN_EMAMI` نه `SEKKEH`).
3. **بدون محدودیت:** ادمین بتواند هر symbol دلخواهی (از جمله نمادهای جدید TGJU که در registry نیست) اضافه کند.
4. **Discovery از TGJU:** dropdown نام فارسی همه‌ی ۳۰۰ ارز موجود در TGJU نشان داده شود.
5. **بدون دو نرخ:** هر symbol در کل سایت فقط **یک** نمایش داشته باشد (یا از TGJU، یا از manual، یا از DB صرافی).

---

## ۳. معماری

### ۳.۱. لایه‌ها

```
┌──────────────────────────────────────────────────────────────────────┐
│ ① Discovery layer (admin dashboard)                                 │
│   - GET /api/market-rates/tgju-symbols → لیست ۳۰۰ ارز TGJU         │
│   - ادمین انتخاب می‌کند → فیلدها auto-fill می‌شود                   │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ ② Storage layer (Prisma + DB)                                       │
│   - ExchangeRate (همان جدول فعلی) + ستون‌های جدید                    │
│   - هر symbol یک ردیف: { symbol, displayNameFa, unit, divisor,     │
│     decimals, group, priority, provider, active, rate, change% }   │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ ③ Refresh layer (cron هر ۶۰ ثانیه)                                  │
│   - همه‌ی provider='auto' را scrape می‌کند و در DB می‌نویسد        │
│   - اگر auto شکست بخورد → مقدار قبلی DB نگه داشته می‌شود           │
│   - revalidateTag('market-rates:ticker')                            │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ ④ Display layer (Server Component)                                   │
│   - از DB می‌خواند (فقط active=true)                                │
│   - بر اساس priority مرتب می‌کند                                    │
│   - در همه‌ی جای سایت که نرخ لازم است (تیکر، /money-transfer، ...) │
│     از همین منبع استفاده می‌شود ⇒ یک نرخ برای هر symbol            │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ ⑤ UI layer (client component)                                       │
│   - هر symbol با { value, unit, change% } رندر می‌شود               │
│   - رنگ و آیکون بر اساس group و sign                                │
└──────────────────────────────────────────────────────────────────────┘
```

### ۳.۲. ساختار فایل‌ها

```
src/lib/market-rates/
  ├── types.ts                 # MarketRateUnit, MarketRateGroup, MarketRateProvider, MarketRateItem
  ├── registry.ts              # SYMBOL_REGISTRY: نگاشت صریح ~۲۵ ارز اصلی
  ├── tgju.ts                  # (از قبل، فقط بازسازی)
  ├── usdt.ts                  # (جدا کردن از exir)
  ├── fx.ts                    # (جدا کردن)
  ├── discovery.ts             # discoverTgjuSymbols() → لیست ۳۰۰ ارز از TGJU
  ├── assembler.ts             # assembleMarketRates() - یک تابع، یک خروجی
  └── index.ts                 # re-exports

src/actions/market-rates.ts    # Server Actions: getMarketRates, createMarketRate, etc.
src/app/api/market-rates/
  └── tgju-symbols/route.ts    # GET endpoint برای discovery
src/app/dashboard/exchange-rates/
  ├── page.tsx                 # (بازسازی: لیست + discovery)
  └── components/
      ├── DiscoveryDropdown.tsx
      ├── RateForm.tsx
      └── RateTable.tsx
```

### ۳.۳. ساختار type ها (خود-توصیف)

```ts
// src/lib/market-rates/types.ts

/** واحد پولی — خودش منبع/مقصد را نشان می‌دهد */
export type MarketRateUnit =
  | 'toman'      // تومان ایران (ریال ÷ ۱۰)
  | 'rial'       // ریال خام (نمایش داده نمی‌شود، فقط ذخیره)
  | 'usd'        // دلار آمریکا (انس، نفت)
  | 'eur'        // یورو
  | 'irr'        // ریال ایران (display alias برای ریال)
  | 'afn'        // افغانی
  | 'pound'      // پوند طلا
  | 'gram';      // گرم طلا (فعلاً استفاده نمی‌شود)

/** گروه‌بندی برای filter و نمایش */
export type MarketRateGroup =
  | 'afghan'         // دلار هرات، افغانی
  | 'iran-forex'     // دلار، یورو، درهم، پوند، لیر (فارکس ایران)
  | 'iran-coin'      // سکه‌های ایرانی
  | 'iran-gold'      // طلای ایرانی
  | 'global'         // انس طلا، نفت (USD/oz)
  | 'minor';         // ارزهای کم‌اهمیت (ین، روبل، روپیه)

/** منبع داده */
export type MarketRateProvider =
  | 'auto'           // خودکار از TGJU/USDT/FX
  | 'manual';        // دستی توسط ادمین

/** یک آیتم نمایش — هر چیزی که UI نیاز دارد */
export interface MarketRateItem {
  symbol: string;            // 'IRAN_USD', 'AFGHANI_USD', 'GLOBAL_OUNCE_GOLD'
  displayNameFa: string;     // 'دلار تهران'
  group: MarketRateGroup;
  unit: MarketRateUnit;
  divisor: number;           // 10 برای ریال، 1 برای بقیه
  decimals: number;          // 0 برای سکه، 2 برای انس
  priority: number;          // 1..99 (عدد کمتر = اول)
  value: number;             // مقدار نهایی (پس از تقسیم بر divisor) — به تومان/USD/...
  changePercent: number;     // -100..+100 (null = نامشخص)
  provider: MarketRateProvider;
  updatedAt: Date;
}
```

### ۳.۴. Registry (نگاشت صریح ۲۰-۲۵ ارز اصلی)

```ts
// src/lib/market-rates/registry.ts

import type { MarketRateGroup, MarketRateUnit } from './types';

export interface SymbolRegistryEntry {
  /** symbol داخلی (self-describing) */
  symbol: string;
  /** نام فارسی */
  displayNameFa: string;
  /** کلید TGJU (اگر scrape می‌شود) */
  tgjuKey?: string;
  /** گروه */
  group: MarketRateGroup;
  /** واحد نمایش */
  unit: MarketRateUnit;
  /** ضریب تبدیل (10 برای ریال، 1 برای دلار) */
  divisor: number;
  /** تعداد رقم اعشار برای نمایش */
  decimals: number;
  /** اولویت در نوار (1=اول) */
  priority: number;
}

export const SYMBOL_REGISTRY: SymbolRegistryEntry[] = [
  // ── Afghan (ویژه افغانستان) ──
  { symbol: 'AFGHANI_USD',  displayNameFa: 'دلار هرات',     group: 'afghan',     unit: 'toman', divisor: 10, decimals: 0, priority: 2 },
  { symbol: 'AFGHANI_AFN',  displayNameFa: 'افغانی',        group: 'afghan',     unit: 'toman', divisor: 10, decimals: 0, priority: 3 },

  // ── Iran Forex (ضروری) ──
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

  // ── Iran Coin ──
  { symbol: 'IRAN_COIN_EMAMI',   displayNameFa: 'سکه امامی',         tgjuKey: 'retail_sekee',   group: 'iran-coin',  unit: 'toman', divisor: 10, decimals: 0, priority: 4 },
  { symbol: 'IRAN_COIN_BAHAR',   displayNameFa: 'سکه بهار آزادی',   tgjuKey: 'retail_sekeb',   group: 'iran-coin',  unit: 'toman', divisor: 10, decimals: 0, priority: 10 },
  { symbol: 'IRAN_COIN_NIM',     displayNameFa: 'نیم سکه',           tgjuKey: 'retail_nim',     group: 'iran-coin',  unit: 'toman', divisor: 10, decimals: 0, priority: 13 },
  { symbol: 'IRAN_COIN_ROB',     displayNameFa: 'ربع سکه',           tgjuKey: 'retail_rob',     group: 'iran-coin',  unit: 'toman', divisor: 10, decimals: 0, priority: 14 },
  { symbol: 'IRAN_COIN_GERAMI',  displayNameFa: 'سکه گرمی',          tgjuKey: 'retail_gerami',  group: 'iran-coin',  unit: 'toman', divisor: 10, decimals: 0, priority: 15 },

  // ── Iran Gold ──
  { symbol: 'IRAN_GOLD_18K',     displayNameFa: 'طلای ۱۸ عیار',      tgjuKey: 'geram18',        group: 'iran-gold',  unit: 'toman', divisor: 10, decimals: 0, priority: 5 },
  { symbol: 'IRAN_GOLD_MESGHAL', displayNameFa: 'مثقال طلا',         tgjuKey: 'mesghal',        group: 'iran-gold',  unit: 'toman', divisor: 10, decimals: 0, priority: 16 },

  // ── Global (دلار جهانی) ──
  { symbol: 'GLOBAL_OUNCE_GOLD', displayNameFa: 'انس طلا',           tgjuKey: 'ons',            group: 'global',     unit: 'usd',   divisor: 1,  decimals: 2, priority: 6 },
  // آینده: نفت برنت (اگر ادمین اضافه کند)
];
```

### ۳.۵. Schema تغییرات (Prisma)

همان جدول `ExchangeRate` فعلی، ستون‌های جدید اضافه می‌شود:

```prisma
model ExchangeRate {
  id          String   @id @default(cuid())
  name        String   @unique
  currency    String   // 'USD', 'EUR', 'SEKKEH' → (deprecate) → 'symbol' (new canonical)
  symbol      String   @unique  // NEW: self-describing (e.g. 'IRAN_USD', 'AFGHANI_USD')
  displayNameFa String  // NEW: 'دلار تهران' (was 'name')
  group       String   // NEW: 'afghan' | 'iran-forex' | 'iran-coin' | 'iran-gold' | 'global' | 'minor'
  unit        String   // NEW: 'toman' | 'usd' | 'eur' | 'afn' | ...
  divisor     Int      @default(1)  // NEW: 10 for rial, 1 for others
  decimals    Int      @default(0)  // NEW
  priority    Int      @default(99) // NEW: 1..99 (lower = first)
  provider    String   @default('auto')  // NEW: 'auto' | 'manual'
  tgjuKey     String?  // NEW: 'price_dollar_rl' (null = manual)
  active      Boolean  @default(true)    // NEW: hide from ticker without deleting

  rateType    RateType @default(BUY_SELL)
  buyRate     String?
  sellRate    String?
  singleRate  String?  // For manual provider: the current value
  bulkRate    String?
  description String?
  imageUrl    String?
  manualNote  String?  // Admin note (e.g. 'صرافی کابل - دستی')

  updatedAt   DateTime @updatedAt
  createdAt   DateTime @default(now())

  @@index([createdAt(sort: Desc)])
  @@index([active, priority])  // NEW: composite for ticker query
  @@index([symbol])            // NEW
}
```

**Migration:**
1. `npx prisma migrate dev --name market_rate_registry_overhaul`
2. Migration script (one-time) داده‌های فعلی `currency` را به `symbol` نگاشت می‌کند (با استفاده از `SYMBOL_REGISTRY`).
3. backward compatible: اگر `symbol` خالی بود، از `currency` استفاده شود (fallback).

### ۳.۶. Assembler (Pipeline داده)

```ts
// src/lib/market-rates/assembler.ts

/**
 * برای هر symbol در DB (active=true):
 *   1. اگر provider='manual' → از ExchangeRate.singleRate
 *   2. اگر provider='auto' و tgjuKey موجود → از TGJU
 *   3. اگر provider='auto' و tgjuKey نبود → از USDT-derived (مثل قبل)
 *   4. اگر همه شکست خورد → مقدار قبلی DB نگه داشته می‌شود (stale)
 *   5. اگر اصلاً داده‌ای نیست → null (در UI نمایش داده نمی‌شود)
 *
 * خروجی: آرایه‌ی واحد از MarketRateItem که در همه‌ی جای سایت استفاده می‌شود.
 */
export async function assembleMarketRates(): Promise<MarketRateItem[]> {
  const dbRows = await prisma.exchangeRate.findMany({
    where: { active: true },
    orderBy: { priority: 'asc' },
  });
  const tgjuMap = await fetchTgjuMap();
  const usdt = await getUsdtRate();
  const fx = await getGlobalFxRates();

  return dbRows.map((row) => {
    const registry = SYMBOL_REGISTRY.find((r) => r.symbol === row.symbol) ?? {
      symbol: row.symbol,
      displayNameFa: row.displayNameFa,
      group: row.group as MarketRateGroup,
      unit: row.unit as MarketRateUnit,
      divisor: row.divisor,
      decimals: row.decimals,
      priority: row.priority,
    };

    // تعیین مقدار
    let rawValue: number | null = null;
    let changePercent: number | null = null;

    if (row.provider === 'manual' && row.singleRate) {
      rawValue = parseFloat(row.singleRate);
    } else if (row.tgjuKey && tgjuMap.has(row.tgjuKey)) {
      const t = tgjuMap.get(row.tgjuKey)!;
      rawValue = t.value;
      changePercent = t.change;
    } else if (row.symbol === 'IRAN_USD' && usdt) {
      rawValue = usdt.toman * (1 + getUsdtPremiumPercent() / 100) * 10; // *10: ریال
      changePercent = usdt.change;
    } else if (usdt && fx) {
      // fx-derived (مطابق spec قبلی)
      const fxKey = (row.symbol.match(/^IRAN_(\w+)$/) || [])[1];
      const perUsd = fxKey ? fx[fxKey] : null;
      if (perUsd && perUsd > 0) {
        rawValue = (usdt.toman / perUsd) * 10; // *10: ریال
      }
    }

    if (rawValue === null || !Number.isFinite(rawValue) || rawValue <= 0) {
      return null; // فیلتر می‌شود
    }

    const value = rawValue / registry.divisor;

    return {
      symbol: row.symbol,
      displayNameFa: row.displayNameFa,
      group: registry.group,
      unit: registry.unit,
      divisor: registry.divisor,
      decimals: registry.decimals,
      priority: registry.priority,
      value,
      changePercent: changePercent ?? 0,
      provider: row.provider as MarketRateProvider,
      updatedAt: row.updatedAt,
    };
  }).filter((item): item is MarketRateItem => item !== null);
}
```

### ۳.۷. Discovery endpoint

```ts
// src/app/api/market-rates/tgju-symbols/route.ts

/**
 * GET /api/market-rates/tgju-symbols
 * لیست همه‌ی symbol های موجود در TGJU (parse شده از homepage).
 * خروجی: [{ tgjuKey, displayNameFa, lastValue, lastChange }, ...]
 *
 * cache: unstable_cache 1h (TGJU homepage خودش CDN cache 5min دارد)
 * auth: SUPER_ADMIN (فقط ادمین)
 */
export async function GET(req: Request) {
  // auth check
  // parse TGJU HTML
  // extract: tgjuKey (data-market-nameslug), displayNameFa (<th>), lastValue, lastChange
  // filter: حذف crypto keys (که در 'iran-forex' نیستند)
  // sort: by displayNameFa alphabetical
  // return JSON
}
```

### ۳.۸. UI Flow در داشبورد

```
┌─ /dashboard/exchange-rates/page.tsx ─────────────────────┐
│  ┌─ لیست فعلی ─────────────────────────────────────┐    │
│  │ Symbol   │ نام       │ گروه │ واحد │ اولویت │ ⋯ │    │
│  │ IRAN_USD │ دلار تهران │ forex│ تومان │ 1      │ ⋯ │    │
│  │ ...                                              │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
│  [+ افزودن نرخ جدید]  ← کلیک می‌شود                     │
│  ┌─ Discovery Dropdown ─────────────────────────────┐    │
│  │ [ سرچ: دلار, سکه, طلا, ... ]                    │    │
│  │ ┌──────────────────────────────────────────────┐ │    │
│  │ │ دلار (price_dollar_rl)         1,615,000  3.19% │   │
│  │ │ یورو (price_eur)               1,852,300  3.21% │   │
│  │ │ سکه (sekee)                  1,679,900,000 4.03% │   │
│  │ │ ...                                          │   │
│  │ └──────────────────────────────────────────────┘ │    │
│  └──────────────────────────────────────────────────┘    │
│  ↓ انتخاب می‌شود ↓                                        │
│  ┌─ Form (auto-filled) ─────────────────────────────┐    │
│  │ Symbol: [IRAN_USD          ] (auto from registry)│    │
│  │ نام:     [دلار تهران         ] (from TGJU <th>)  │    │
│  │ گروه:   [▼ iran-forex     ]                       │    │
│  │ واحد:   [▼ تومان            ]                     │    │
│  │ Divisor: [10                ] (auto: 10 برای ریال)│    │
│  │ اعشار:  [0                  ]                     │    │
│  │ اولویت: [1                  ]                     │    │
│  │ TGJU Key: [price_dollar_rl ] (auto, فقط‌خواندنی) │    │
│  │ Provider: [▼ auto            ]                    │    │
│  │ Active:   [✓]                                     │    │
│  │                                                    │    │
│  │ [ذخیره]  [لغو]                                    │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
│  [+ نرخ سفارشی (manual)]  ← برای ارزی که در TGJU نیست  │
└────────────────────────────────────────────────────────────┘
```

### ۳.۹. ضد «دو نرخ» — Single Source of Truth

`assembleMarketRates()` **تنها منبع** است. هر جای سایت (تیکر، `/money-transfer`، `/dashboard/exchange-rates`) از این تابع استفاده می‌کند. اگر:
- symbol در DB موجود باشد → از DB (با provider='auto' یا 'manual')
- symbol در DB نباشد → اصلاً نمایش داده نمی‌شود (نه TGJU مستقیم، نه FX)

این تضمین می‌کند **هر ارز در کل سایت فقط یک نمایش** دارد. `freeMarketRates.ts` فعلی deprecate می‌شود و فقط به‌عنوان fallback داخلی assembler استفاده می‌شود (برای symbol هایی که در DB نیستند ولی ادمین هنوز اضافه نکرده).

### ۳.۱۰. Refresh Cron

```ts
// src/app/api/cron/refresh-market-rates/route.ts

/**
 * POST /api/cron/refresh-market-rates
 * هر ۶۰ ثانیه فراخوانی می‌شود (یا ۱۰ دقیقه مثل قبلی).
 * - همه‌ی ExchangeRate با provider='auto' و active=true
 * - TGJU scrape → اگر موفق: singleRate و changePercent به‌روز می‌شود
 * - اگر TGJU شکست: مقدار قبلی نگه داشته می‌شود + لاگ
 * - revalidateTag('market-rates:ticker')
 */
```

### ۳.۱۱. UI نوار بالا — رندر نهایی

```tsx
// MarketRatesTickerBar.tsx (rebuilt)

{items.map((rate) => (
  <div key={rate.symbol} className="flex items-center gap-2 px-3 ...">
    {/* Symbol (از registry، self-describing) */}
    <span>{rate.symbol.replace(/_/g, ' ')}</span>  // 'IRAN USD' یا نام مستعار
    {/* یا: <CurrencyIcon symbol={rate.symbol} /> */}

    {/* Value با واحد درست */}
    <span dir="ltr">
      {formatWithUnit(rate.value, rate.unit, rate.decimals)}
    </span>

    {/* Change pill */}
    {rate.changePercent !== 0 && (
      <span className={...}>
        {rate.changePercent > 0 ? <TrendingUp /> : <TrendingDown />}
        <span dir="ltr">{formatChange(rate.changePercent)}%</span>
      </span>
    )}
  </div>
))}
```

**`formatWithUnit` helper:**
```ts
// src/lib/market-rates/format.ts
export function formatWithUnit(value: number, unit: MarketRateUnit, decimals: number): string {
  const formatted = new Intl.NumberFormat('fa-IR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

  const unitLabel: Record<MarketRateUnit, string> = {
    toman: 'تومان',
    rial: 'ریال',
    usd: 'دلار',
    eur: 'یورو',
    irr: 'ریال',
    afn: 'افغانی',
    pound: 'پوند',
    gram: 'گرم',
  };

  return decimals === 0 ? `${formatted} ${unitLabel[unit]}` : `${formatted} ${unitLabel[unit]}`;
}
```

**مثال خروجی (probe امروز):**
- `IRAN_USD`: `۱۶۱,۵۰۰ تومان ↑+۳.۱۹%`
- `IRAN_COIN_EMAMI`: `۱۶۷,۹۹۰,۰۰۰ تومان ↑+۴.۰۳%`
- `IRAN_GOLD_18K`: `۱۶,۲۲۱,۰۰۰ تومان ↑+۳.۵۵%`
- `GLOBAL_OUNCE_GOLD`: `۴,۱۶۰.۲۶ دلار ↑+۰.۱۴%`

---

## ۴. تغییرات کلیدی فایل‌ها

| فایل | تغییر | ریسک |
|------|--------|------|
| `prisma/schema.prisma` | ستون‌های جدید به `ExchangeRate` | متوسط (migration) |
| `prisma/seed.js` | seed ۲۰ ارز اصلی از SYMBOL_REGISTRY | پایین |
| `src/lib/market-rates/registry.ts` | **جدید** — SYMBOL_REGISTRY | — |
| `src/lib/market-rates/types.ts` | **جدید** — types مشترک | — |
| `src/lib/market-rates/assembler.ts` | **جدید** — single source of truth | — |
| `src/lib/market-rates/format.ts` | **جدید** — formatWithUnit | — |
| `src/lib/market-rates/discovery.ts` | **جدید** — parse TGJU homepage | — |
| `src/lib/tgju.ts` | rename → `src/lib/market-rates/tgju.ts` | پایین (re-export از root) |
| `src/lib/freeMarketRates.ts` | deprecate → فقط داخلی assembler | بالا (تست همه‌ی مصرف‌کننده‌ها) |
| `src/actions/market-rates.ts` | **جدید** — Server Actions | — |
| `src/app/api/market-rates/tgju-symbols/route.ts` | **جدید** — discovery endpoint | — |
| `src/app/api/cron/refresh-market-rates/route.ts` | **جدید** — refresh cron | — |
| `src/app/dashboard/exchange-rates/page.tsx` | بازسازی با DiscoveryDropdown | متوسط |
| `src/app/(site)/(home)/designs/MarketRatesTickerBar.tsx` | مصرف `MarketRateItem[]` | پایین |

---

## ۵. مهاجرت (Migration Plan)

### ۵.۱. مراحل (zero-downtime)

1. **Schema migration** (Prisma): ستون‌های جدید اضافه می‌شود (nullable, with defaults). داده‌ی موجود دست‌نخورده.
2. **Backfill script** (`scripts/backfill-market-rates.mjs`):
   - برای هر `ExchangeRate` موجود، از `SYMBOL_REGISTRY` نگاشت کن
   - اگر `currency='USD'` بود → `symbol='IRAN_USD'`
   - اگر mapping نبود → manual resolve prompt (لاگ می‌شود)
3. **Deploy new assembler** با fallback به legacy code:
   - اگر `symbol` ست شده بود → از registry
   - اگر نه → از legacy (فعلی)
4. **Smoke test** در dev
5. **Production deploy** (slow rollout)
6. **Cleanup:** legacy code حذف شود (یک هفته بعد)

### ۵.۲. Backward Compatibility

- **اگر `symbol=null`:** assembler از `currency` (فیلد قدیمی) استفاده می‌کند و سعی می‌کند در `SYMBOL_REGISTRY` پیدا کند.
- **اگر در registry نبود:** manual resolve (log warning).
- **Build نمی‌شکند** چون همه‌ی ستون‌ها default دارند.

### ۵.۳. Rollback

- Migration برگشت‌پذیر (`prisma migrate resolve --rolled-back`)
- Assembler dual-mode (legacy + new) ⇒ می‌توان به legacy برگشت
- هیچ داده‌ای حذف نمی‌شود

---

## ۶. خطاها و تست

### ۶.۱. سناریوهای بحرانی

| سناریو | رفتار مطلوب |
|--------|--------------|
| TGJU در دسترس نیست | مقدار قبلی DB نگه داشته می‌شود + badge زرد "آفلاین" |
| ادمین ارز جدید اضافه می‌کند | discovery → انتخاب → auto-fill → ذخیره → < 60s در نوار |
| ادمین ارزی که قبلاً در DB است را duplicate اضافه می‌کند | unique constraint روی `symbol` ⇒ error فارسی واضح |
| symbol در DB ولی `tgjuKey` خالی و provider='auto' | خطای configuration ⇒ log + skip از ticker |
| دو symbol یکی در auto، یکی در manual برای ارز مشابه | unique constraint ⇒ فقط یکی می‌ماند |
| نرخ خیلی بزرگ (مثلاً ۹۹۹,۹۹۹,۹۹۹,۹۹۹) | formatter با Intl مدیریت می‌کند |
| تغییر در ساختار HTML TGJU | discovery fail می‌شود + error واضح به ادمین |
| Cron هر ۶۰s اجرا می‌شود ولی DB در دسترس نیست | لاگ + retry بعدی، صفحه از cache قبلی سرو می‌شود |

### ۶.۲. تست‌ها (manual smoke، چون فریم‌ورک test نیست)

1. **Unit 1**: `formatWithUnit(161500, 'toman', 0)` → `'۱۶۱,۵۰۰ تومان'`
2. **Unit 2**: `formatWithUnit(4160.26, 'usd', 2)` → `'۴,۱۶۰.۲۶ دلار'`
3. **Unit 3**: `formatWithUnit(167990000, 'toman', 0)` → `'۱۶۷,۹۹۰,۰۰۰ تومان'`
4. **Integration 1**: ادمین `دلار تهران` را discovery می‌کند → form پر می‌شود → ذخیره → < 60s در نوار
5. **Integration 2**: ادمین symbol جدیدی اضافه می‌کند که در TGJU نیست → provider='manual' → مقدار دستی وارد می‌کند → در نوار نمایش داده می‌شود
6. **Regression 1**: در `/money-transfer`، نرخ دلار = نرخ نوار بالا (یک منبع)
7. **Regression 2**: صفحه‌ی اصلی در موبایل/دسکتاپ بدون overflow
8. **i18n**: BiDi درست کار می‌کند (عدد در `<span dir="ltr">`)
9. **Performance**: نوار لود < 200ms (cache 60s)

### ۶.۳. ریسک‌ها

| ریسک | شدت | راهکار |
|------|-----|--------|
| TGJU ساختار HTML را عوض کند | بالا | parser با regex ساده ⇒ شکننده؛ باید مانیتور شود. صفحه‌ی `/dashboard/exchange-rates` یک health check برای TGJU scraping دارد |
| Migration ستون‌های جدید روی production کند باشد | پایین | جدول کوچک (< 100 ردیف)، < 1s |
| ادمین symbol تکراری وارد کند | پایین | unique constraint |
| نرخ ۱۰× اشتباه شود (مثل ریال/تومان) | بحرانی | **مهم‌ترین ریسک.** تست‌های واحد روی formatWithUnit + visual review اجباری قبل از deploy |
| Cron ۶۰s بار اضافی روی TGJU | متوسط | TGJU CDN cache 5min دارد + cron داخل Next کار می‌کند (نه external) |
| `bs-fallback` حذف شدن، اگر همه‌ی منابع fail شوند | متوسط | stale DB value + badge "آفلاین" |

---

## ۷. Rollback

- **مرحله ۱**: revert migration → همه‌ی ستون‌های جدید `null` می‌شوند (nullable)
- **مرحله ۲**: assembler به legacy برمی‌گردد (env var `MARKET_RATES_ASSEMBLER=legacy`)
- **مرحله ۳**: `prisma migrate resolve --rolled-back`
- **هیچ داده‌ای حذف نمی‌شود** — `currency` قدیمی هنوز هست

---

## ۸. تأیید نهایی

- [x] Design با کاربر تأیید شد (۲۰۲۶-۰۶-۲۰)
- [ ] Implementation plan نوشته شد
- [ ] تست‌های smoke در dev اجرا شد
- [ ] Build بدون خطا (`npm run build`)

---

## ۹. یادداشت‌ها

- `currency` field deprecate می‌شود ولی حذف نمی‌شود (backward compat)
- `singleRate` برای manual provider استفاده می‌شود (نرخ فعلی)
- `bulkRate` برای حالت آینده (bulk pricing) نگه داشته می‌شود
- هیچ breaking change در API های موجود نیست (Server Action های فعلی `/dashboard/exchange-rates` همان signature را دارند ولی فیلدهای بیشتری می‌گیرند)
- **اولویت پیاده‌سازی**: registry → migration → assembler → discovery → UI داشبورد → refresh cron → cleanup legacy
