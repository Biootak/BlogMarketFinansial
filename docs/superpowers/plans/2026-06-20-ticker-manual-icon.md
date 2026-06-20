# ارتقای تیکر بازار آزاد — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** اضافه کردن ایکون اختصاصی برای هر ارز، slot ویژه‌ی افغانستان، manual override از داشبورد، و fallback هوشمند به DB در تیکر بالای اسلایدر اصلی.

**Architecture:** توسعه‌ی `assembleFreeMarketRates()` برای اضافه کردن دو لایه‌ی جدید (manual map + db-fallback با age) قبل از خروجی؛ اضافه کردن `<CurrencyIcon>` و `<AfghanSlot>` به UI تیکر؛ migration جدید برای ستون‌های manual در `ExchangeRate`.

**Tech Stack:** Next.js 16, Prisma, PostgreSQL, react-icons/tb, Tailwind CSS v4, TypeScript.

**Spec:** `docs/superpowers/specs/2026-06-20-ticker-manual-icon-design.md`

---

## File Structure

فایل‌هایی که ساخته یا تغییر داده می‌شن:

| File | Action | Responsibility |
|------|--------|----------------|
| `prisma/schema.prisma` | Modify | اضافه کردن ستون‌های `manualRate`, `manualActive`, `manualNote`, `manualUpdatedAt` |
| `prisma/migrations/20260620*/migration.sql` | Auto-generated | schema migration |
| `src/types/types.ts` | Modify | اضافه کردن فیلدهای manual به `ExchangeRateData` |
| `src/lib/currencyIcons.ts` | Create | نگاشت symbol → ایکون react-icons/tb |
| `src/lib/freeMarketRates.ts` | Modify | اضافه کردن manual/db-fallback + normalize change |
| `src/lib/tgju.ts` | Modify | اعمال normalizeChange برای outlier |
| `src/actions/exchange-rates.ts` | Modify | پشتیبانی از فیلدهای manual در CRUD |
| `src/app/dashboard/exchange-rates/page.tsx` | Modify | UI فیلدهای manual در فرم و جدول |
| `src/app/(site)/(home)/designs/AfghanSlot.tsx` | Create | sub-component نمایش ارزهای افغانستان |
| `src/app/(site)/(home)/designs/MarketRatesTickerBar.tsx` | Modify | استفاده از ایکون‌ها، badge، slot، duration جدید |

---

## Task 1: Migration — اضافه کردن فیلدهای manual به ExchangeRate

**Files:**
- Modify: `prisma/schema.prisma:325-343`
- Auto-create: `prisma/migrations/<timestamp>_add_manual_override_to_exchange_rate/migration.sql`

- [ ] **Step 1: Schema را ویرایش کن**

در `prisma/schema.prisma`، داخل `model ExchangeRate` بعد از `imageUrl` اضافه کن:

```prisma
  // 2026-06-20: manual override (ادامه‌ی manualRate که ادمین در داشبورد تنظیم می‌کنه)
  manualRate      String?
  manualActive    Boolean   @default(false)
  manualNote      String?
  manualUpdatedAt DateTime?
```

- [ ] **Step 2: migration بساز**

```bash
cd /c/Users/Biotak/Desktop/FinancialMarket
npx prisma migrate dev --name add_manual_override_to_exchange_rate
```

انتظار: یک پوشه‌ی جدید در `prisma/migrations/` ساخته می‌شه با `migration.sql`.

- [ ] **Step 3: بررسی تولید Prisma Client**

```bash
cd /c/Users/Biotak/Desktop/FinancialMarket
npx prisma generate
```

انتظار: `Generated Prisma Client (vX.X.X)`.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/Biotak/Desktop/FinancialMarket
git add prisma/schema.prisma prisma/migrations/ docs/superpowers/plans/
git commit -m "feat(schema): add manualRate/manualActive/manualNote/manualUpdatedAt to ExchangeRate"
```

---

## Task 2: types/types.ts — اضافه کردن فیلدهای manual

**Files:**
- Modify: `src/types/types.ts:383-395`

- [ ] **Step 1: Interface را ویرایش کن**

در `src/types/types.ts`، `interface ExchangeRateData` را به‌روز کن:

```ts
export interface ExchangeRateData {
  id: string;
  name: string;
  currency: string;
  rateType: RateType;
  buyRate: string | null;
  sellRate: string | null;
  singleRate: string | null;
  bulkRate: string | null;
  imageUrl: string | null;
  description: string | null;
  // 2026-06-20: manual override
  manualRate: string | null;
  manualActive: boolean;
  manualNote: string | null;
  manualUpdatedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /c/Users/Biotak/Desktop/FinancialMarket
npx tsc --noEmit 2>&1 | head -30
```

انتظار: خطای type فقط اگه جای دیگه‌ای از کد به فیلدهای جدید ارجاع داده باشه (نباید باشه چون همه‌ی استفاده‌ها optional هستن).

- [ ] **Step 3: Commit**

```bash
cd /c/Users/Biotak/Desktop/FinancialMarket
git add src/types/types.ts
git commit -m "feat(types): add manual override fields to ExchangeRateData"
```

---

## Task 3: currencyIcons.ts — نگاشت symbol به ایکون

**Files:**
- Create: `src/lib/currencyIcons.ts`

- [ ] **Step 1: فایل را بساز**

```ts
// src/lib/currencyIcons.ts
// نگاشت symbol (canonical) → ایکون اختصاصی از react-icons/tb.
// برای ارزهایی که ایکون اختصاصی ندارن، TbCoin به‌عنوان fallback استفاده می‌شه.

import type { IconType } from 'react-icons';
import {
  TbCoin,
  TbCoinFilled,
  TbCurrencyAfghani,
  TbCurrencyBitcoin,
  TbCurrencyDirham,
  TbCurrencyDogecoin,
  TbCurrencyDollar,
  TbCurrencyEthereum,
  TbCurrencyEuro,
  TbCurrencyFrank,
  TbCurrencyIranianRial,
  TbCurrencyLitecoin,
  TbCurrencyMonero,
  TbCurrencyPound,
  TbCurrencyRipple,
  TbCurrencySolana,
  TbCurrencyTether,
  TbCurrencyYen,
  TbCurrencyYuan,
} from 'react-icons/tb';

export const CURRENCY_ICON: Record<string, IconType> = {
  // Forex
  USD: TbCurrencyDollar,
  EUR: TbCurrencyEuro,
  GBP: TbCurrencyPound,
  AED: TbCurrencyDirham,
  CHF: TbCurrencyFrank,
  CAD: TbCurrencyDollar,
  AUD: TbCurrencyDollar,
  CNY: TbCurrencyYuan,
  JPY: TbCurrencyYen,
  RUB: TbCoinFilled,
  INR: TbCoinFilled,
  TRY: TbCoinFilled,
  IRR: TbCurrencyIranianRial,

  // ارزهای افغانستان (ایکون بصری یکسان برای همه‌ی ارزهای افغان)
  AFN: TbCurrencyAfghani,
  USD_HERAT: TbCurrencyAfghani,
  USD_AFG: TbCurrencyAfghani,

  // طلا و سکه
  SEKKEH: TbCoin,
  BAHAR: TbCoin,
  NIM: TbCoin,
  ROB: TbCoin,
  GERAMI: TbCoin,
  GOLD18: TbCoin,
  ABSHODEH: TbCoin,
  OUNCE_GOLD: TbCoin,

  // Crypto (هر چند در این تیکر معمولاً نیست، ولی برای کامل بودن)
  BTC: TbCurrencyBitcoin,
  ETH: TbCurrencyEthereum,
  USDT: TbCurrencyTether,
  LTC: TbCurrencyLitecoin,
  XRP: TbCurrencyRipple,
  SOL: TbCurrencySolana,
  DOGE: TbCurrencyDogecoin,
  XMR: TbCurrencyMonero,
};

export function getCurrencyIcon(symbol: string): IconType {
  return CURRENCY_ICON[symbol] ?? TbCoin;
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /c/Users/Biotak/Desktop/FinancialMarket
npx tsc --noEmit 2>&1 | head -10
```

انتظار: بدون خطا.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/Biotak/Desktop/FinancialMarket
git add src/lib/currencyIcons.ts
git commit -m "feat(lib): add currencyIcons mapping for ticker"
```

---

## Task 4: tgju.ts — normalize outlier در `change%`

**Files:**
- Modify: `src/lib/tgju.ts:76-93`

- [ ] **Step 1: helper اضافه کن**

در بالای `src/lib/tgju.ts` بعد از `const TGJU_URL = 'https://www.tgju.org/';` اضافه کن:

```ts
// 2026-06-20: TGJU گاهی درصد تغییر خیلی بزرگ (outlier) برمی‌گردونه.
// این helper عدد غیرعادی رو صفر می‌کنه تا درصد معقول نشون داده بشه.
function normalizeChangePercent(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  if (Math.abs(raw) > 50) return 0;
  return Math.round(raw * 100) / 100;
}
```

- [ ] **Step 2: در parseRow استفاده کن**

خط `const change = changeMatch ? Number.parseFloat(changeMatch[1]) : 0;` رو با این عوض کن:

```ts
  const changeRaw = changeMatch ? Number.parseFloat(changeMatch[1]) : 0;
  const change = normalizeChangePercent(changeRaw);
```

- [ ] **Step 3: Typecheck**

```bash
cd /c/Users/Biotak/Desktop/FinancialMarket
npx tsc --noEmit 2>&1 | head -10
```

انتظار: بدون خطا.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/Biotak/Desktop/FinancialMarket
git add src/lib/tgju.ts
git commit -m "feat(tgju): normalize outlier change percent (>|50| -> 0)"
```

---

## Task 5: freeMarketRates.ts — اضافه کردن manual و db-fallback

**Files:**
- Modify: `src/lib/freeMarketRates.ts:91-141, 147-157, 269-297, 329-432`

- [ ] **Step 1: MarketSource را گسترش بده**

خط ۱۴۷ رو به این تغییر بده:

```ts
export type MarketSource = 'manual' | 'tgju' | 'usdt' | 'fx-derived' | 'db-fallback';
```

- [ ] **Step 2: FreeMarketItem را گسترش بده**

خطوط ۱۴۹-۱۵۷ رو به این تغییر بده:

```ts
export interface FreeMarketItem {
  symbol: string;
  name: string;
  priceToman: number;
  change: number;
  source: MarketSource;
  /** کلید اصلی در منبع — برای دیباگ. */
  rawKey?: string;
  /** فقط برای db-fallback: چند دقیقه از آخرین به‌روزرسانی گذشته. */
  ageMinutes?: number;
  /** فقط برای manual: زمان آخرین ویرایش ادمین. */
  manualUpdatedAt?: Date;
}
```

- [ ] **Step 3: canonical‌های جدید اضافه کن**

خطوط ۹۱-۱۱۲ (`WANTED_CANONICAL`) را به این تغییر بده:

```ts
const WANTED_CANONICAL: readonly string[] = [
  // Forex
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
  // ارزهای افغانستان (manual یا db-fallback)
  'AFN',
  'USD_HERAT',
  'USD_AFG',
  // Coins & gold
  'SEKKEH',
  'NIM',
  'ROB',
  'GERAMI',
  'GOLD18',
  'OUNCE_GOLD',
];
```

- [ ] **Step 4: DISPLAY_NAMES را گسترش بده**

بعد از `TRY: 'لیر ترکیه',` اضافه کن:

```ts
  IRR: 'ریال ایران',
  AFN: 'افغانی افغانستان',
  USD_HERAT: 'دلار هرات',
  USD_AFG: 'دلار افغانی',
```

- [ ] **Step 5: getManualMap اضافه کن**

بعد از `getDbMarketItems` (خطوط ۲۷۶-۲۹۷) این بلاک را اضافه کن:

```ts
/* -------------------------------------------------------------------------- */
/*  Step 0 — Manual override از DB                                            */
/* -------------------------------------------------------------------------- */

interface ManualRow {
  symbol: string;
  name: string;
  price: number;
  manualUpdatedAt: Date | null;
  note: string | null;
}

async function getManualMap(): Promise<Map<string, ManualRow>> {
  try {
    const rows = await prisma.exchangeRate.findMany({
      where: {
        manualActive: true,
        manualRate: { not: null },
      },
      select: {
        currency: true,
        name: true,
        manualRate: true,
        manualUpdatedAt: true,
        manualNote: true,
      },
    });
    const map = new Map<string, ManualRow>();
    for (const row of rows) {
      if (!row.manualRate) continue;
      const price = Number.parseFloat(row.manualRate);
      if (!Number.isFinite(price) || price <= 0) continue;
      const sym = row.currency.toUpperCase();
      map.set(sym, {
        symbol: sym,
        name: row.name || sym,
        price,
        manualUpdatedAt: row.manualUpdatedAt,
        note: row.manualNote,
      });
    }
    return map;
  } catch {
    return new Map();
  }
}
```

- [ ] **Step 6: getDbMarketItems را اصلاح کن تا ageMinutes محاسبه کنه**

تابع فعلی (`getDbMarketItems` در خطوط ۲۷۶-۲۹۷) رو با این عوض کن:

```ts
async function getDbMarketItems(): Promise<Map<string, DbRow & { updatedAt: Date | null }>> {
  try {
    const rows = await prisma.exchangeRate.findMany({
      take: 60,
      orderBy: { createdAt: 'desc' },
    });
    const map = new Map<string, DbRow & { updatedAt: Date | null }>();
    for (const row of rows) {
      const sym = row.currency.toUpperCase();
      if (CRYPTO_LIKE.has(sym)) continue;
      if (map.has(sym)) continue;
      const value = row.buyRate || row.singleRate;
      if (!value) continue;
      const price = Number.parseFloat(value);
      if (Number.isNaN(price) || price <= 0) continue;
      map.set(sym, {
        symbol: sym,
        name: row.name || sym,
        price,
        updatedAt: row.updatedAt,
      });
    }
    return map;
  } catch {
    return new Map();
  }
}
```

- [ ] **Step 7: assembleFreeMarketRates را بازنویسی کن**

تابع `assembleFreeMarketRates` (خطوط ۳۲۹-۴۳۲) را با این نسخه‌ی جدید عوض کن:

```ts
export async function assembleFreeMarketRates(): Promise<AssembledMarket> {
  // 1) همه‌ی منابع موازی
  const [manual, tgju, usdt, fx, dbItems] = await Promise.all([
    getManualMap(),
    fetchTgjuMap(),
    getUsdtRate(),
    getGlobalFxRates(),
    getDbMarketItems(),
  ]);

  const items: FreeMarketItem[] = [];
  const addedSymbols = new Set<string>();
  const now = Date.now();

  // 2) برای هر ارز، اولویت‌ها رو امتحان کن
  for (const canonical of WANTED_CANONICAL) {
    // Priority 1: Manual override
    const m = manual.get(canonical);
    if (m) {
      items.push({
        symbol: canonical,
        name: m.name,
        priceToman: Math.round(m.price),
        change: 0,
        source: 'manual',
        rawKey: 'manual-db',
        manualUpdatedAt: m.manualUpdatedAt ?? undefined,
      });
      addedSymbols.add(canonical);
      continue;
    }

    // Priority 2: TGJU
    const t = tgju.get(canonical);
    if (t) {
      items.push({
        symbol: canonical,
        name: DISPLAY_NAMES[canonical] ?? canonical,
        priceToman: t.priceToman,
        change: t.change,
        source: 'tgju',
        rawKey: t.rawKey,
      });
      addedSymbols.add(canonical);
      continue;
    }

    // Priority 3: USDT-derived (فقط USD)
    if (canonical === 'USD' && usdt) {
      const premium = getUsdtPremiumPercent();
      const priceToman = usdt.toman * (1 + premium / 100);
      items.push({
        symbol: 'USD',
        name: DISPLAY_NAMES.USD,
        priceToman: Math.round(priceToman),
        change: usdt.change,
        source: 'usdt',
        rawKey: 'usdt-exir',
      });
      addedSymbols.add('USD');
      continue;
    }

    // Priority 4: USDT × FX
    if (usdt && fx) {
      const fxKey = getFxKey(canonical);
      if (fxKey) {
        const perUsd = fx[fxKey];
        if (Number.isFinite(perUsd) && perUsd > 0) {
          let priceToman = usdt.toman / perUsd;
          if (['JPY', 'CNY', 'RUB', 'INR'].includes(canonical)) {
            priceToman = priceToman / 10;
          }
          items.push({
            symbol: canonical,
            name: DISPLAY_NAMES[canonical] ?? canonical,
            priceToman: Math.round(priceToman),
            change: 0,
            source: 'fx-derived',
            rawKey: fxKey,
          });
          addedSymbols.add(canonical);
          continue;
        }
      }
    }

    // Priority 5: DB fallback (cron-synced values)
    const db = dbItems.get(canonical);
    if (db) {
      const ageMs = db.updatedAt ? now - db.updatedAt.getTime() : 0;
      const ageMinutes = Math.round(ageMs / 60_000);
      items.push({
        symbol: canonical,
        name: db.name,
        priceToman: Math.round(db.price),
        change: 0,
        source: 'db-fallback',
        rawKey: 'exchange-rate-db',
        ageMinutes,
      });
      addedSymbols.add(canonical);
      continue;
    }
  }

  const usdItem = items.find((i) => i.symbol === 'USD');
  return {
    usdRate: usdItem?.priceToman ?? null,
    usdSource: usdItem?.source ?? null,
    items,
  };
}
```

- [ ] **Step 8: Typecheck**

```bash
cd /c/Users/Biotak/Desktop/FinancialMarket
npx tsc --noEmit 2>&1 | head -20
```

انتظار: بدون خطا.

- [ ] **Step 9: Commit**

```bash
cd /c/Users/Biotak/Desktop/FinancialMarket
git add src/lib/freeMarketRates.ts
git commit -m "feat(freeMarketRates): add manual + db-fallback layers + canonical Afghan currencies"
```

---

## Task 6: actions/exchange-rates.ts — پشتیبانی از فیلدهای manual

**Files:**
- Modify: `src/actions/exchange-rates.ts:9-65`

- [ ] **Step 1: Zod schema را گسترش بده**

خطوط ۹-۱۹ (Zod schema) را با این عوض کن:

```ts
const exchangeRateSchema = z.object({
  name: z.string(),
  currency: z.string(),
  rateType: z.enum(['BUY_SELL', 'SINGLE_BULK']),
  buyRate: z.string().optional(),
  sellRate: z.string().optional(),
  singleRate: z.string().optional(),
  bulkRate: z.string().optional(),
  imageUrl: z.string().optional(),
  description: z.string().optional(),
  // 2026-06-20: manual override
  manualRate: z.string().optional().nullable(),
  manualActive: z.boolean().optional(),
  manualNote: z.string().optional().nullable(),
});
```

- [ ] **Step 2: createExchangeRate را به‌روز کن**

تابع `createExchangeRate` (خطوط ۲۸-۶۵) را با این نسخه عوض کن:

```ts
export async function createExchangeRate(
  data: Omit<ExchangeRateData, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<ActionResult<ExchangeRateData>> {
  try {
    const validationResult = exchangeRateSchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        message: `Invalid data: ${validationResult.error.message}`,
        error: validationResult.error.message,
      };
    }

    const newExchangeRate = await prisma.exchangeRate.create({
      data: {
        ...validationResult.data,
        manualUpdatedAt: data.manualActive && data.manualRate ? new Date() : null,
      },
    });

    revalidatePath('/dashboard/admin/exchange-rates');
    revalidateTag('ticker');
    revalidateTag('exchange-rates');
    revalidateTag('dashboard-exchange-rates');

    return {
      success: true,
      variant: 'success',
      message: 'ارز با موفقیت ایجاد شد.',
      data: newExchangeRate,
    };
  } catch (error) {
    console.error('خطا در ایجاد ارز:', error);
    return {
      success: false,
      variant: 'destructive',
      message: 'خطا در ایجاد ارز. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
```

- [ ] **Step 3: updateExchangeRate را به‌روز کن**

تابع `updateExchangeRate` (خطوط ۶۷-۱۰۵) را با این عوض کن:

```ts
export async function updateExchangeRate(
  id: string,
  data: Partial<Omit<ExchangeRateData, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<ActionResult<ExchangeRateData>> {
  try {
    const validationResult = exchangeRateSchema.partial().safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        variant: 'destructive',
        message: `Invalid data: ${validationResult.error.message}`,
        error: validationResult.error.message,
      };
    }

    // 2026-06-20: اگه manual فعال/غیرفعال شده یا مقدار manualRate تغییر کرده، manualUpdatedAt رو به‌روز کن
    const existing = await prisma.exchangeRate.findUnique({ where: { id } });
    const manualChanged =
      existing &&
      (data.manualActive !== existing.manualActive ||
        data.manualRate !== existing.manualRate);
    const manualUpdatedAt =
      manualChanged && (data.manualActive ?? existing.manualActive)
        ? new Date()
        : existing?.manualUpdatedAt ?? null;

    const updatedExchangeRate = await prisma.exchangeRate.update({
      where: { id },
      data: {
        ...validationResult.data,
        manualUpdatedAt,
      },
    });

    revalidatePath('/dashboard/admin/exchange-rates');
    revalidateTag('ticker');
    revalidateTag('exchange-rates');
    revalidateTag('dashboard-exchange-rates');

    return {
      success: true,
      variant: 'success',
      message: 'ارز با موفقیت به‌روزرسانی شد.',
      data: updatedExchangeRate,
    };
  } catch (error) {
    console.error('خطا در به‌روزرسانی ارز:', error);
    return {
      success: false,
      message: 'خطا در به‌روزرسانی ارز. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
```

- [ ] **Step 4: Typecheck**

```bash
cd /c/Users/Biotak/Desktop/FinancialMarket
npx tsc --noEmit 2>&1 | head -20
```

انتظار: بدون خطا.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/Biotak/Desktop/FinancialMarket
git add src/actions/exchange-rates.ts
git commit -m "feat(actions): support manual override fields in exchange-rate CRUD"
```

---

## Task 7: UI داشبورد — فرم manual

**Files:**
- Modify: `src/app/dashboard/exchange-rates/page.tsx:37-47, 233-299, 302-371`

- [ ] **Step 1: فرم values را گسترش بده**

`interface ExchangeRateFormValues` (خطوط ۳۷-۴۷) را با این عوض کن:

```ts
interface ExchangeRateFormValues {
  name: string;
  currency: string;
  rateType: RateType;
  buyRate: string;
  sellRate: string;
  singleRate: string;
  bulkRate: string;
  imageUrl: string | null;
  description: string | null;
  // 2026-06-20: manual override
  manualRate: string;
  manualActive: boolean;
  manualNote: string;
}
```

- [ ] **Step 2: useForm defaultValues را گسترش بده**

خطوط ۵۶-۵۸ را با این عوض کن:

```tsx
const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm<ExchangeRateFormValues>({
  defaultValues: { rateType: 'BUY_SELL', manualRate: '', manualActive: false, manualNote: '' },
});
```

- [ ] **Step 3: سوئیچ manualActive به فرم Create اضافه کن**

بعد از `description` (حدوداً خط ۲۸۸) قبل از `imageUrl` این بلاک را اضافه کن:

```tsx
            {/* ─── Manual Override (2026-06-20) ─── */}
            <div className="space-y-3 pt-3 border-t border-neutral-200/60 dark:border-neutral-700/60">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">حالت دستی</Label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('manualActive')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:border-neutral-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">نرخ دستی (تومان)</Label>
                <Input
                  {...register('manualRate')}
                  placeholder="مثلاً 72500 — اولویت اول روی تیکر"
                  className={inputClassName}
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">یادداشت</Label>
                <Input
                  {...register('manualNote')}
                  placeholder="مثلاً صرافی کابل"
                  className={inputClassName}
                />
              </div>
            </div>
```

- [ ] **Step 4: همان بلاک را به فرم Edit هم اضافه کن**

همون کد Step 3 رو بعد از فیلد `description` در فرم Edit (حدوداً خط ۳۵۶) کپی کن.

- [ ] **Step 5: badge «دستی» در جدول اضافه کن**

بعد از `exchangeRate.name` در ستون دوم جدول (حدوداً خط ۱۹۰) این خط رو اضافه کن:

```tsx
                  <DashboardTableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">{exchangeRate.name}</span>
                      {exchangeRate.manualActive && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          دستی
                        </span>
                      )}
                    </div>
                  </DashboardTableCell>
```

- [ ] **Step 6: Typecheck و Lint**

```bash
cd /c/Users/Biotak/Desktop/FinancialMarket
npx tsc --noEmit 2>&1 | head -20
npm run lint 2>&1 | tail -20
```

انتظار: بدون خطا.

- [ ] **Step 7: Commit**

```bash
cd /c/Users/Biotak/Desktop/FinancialMarket
git add src/app/dashboard/exchange-rates/page.tsx
git commit -m "feat(dashboard): add manual override UI in exchange-rates form and table"
```

---

## Task 8: AfghanSlot.tsx — کامپوننت slot افغانستان

**Files:**
- Create: `src/app/(site)/(home)/designs/AfghanSlot.tsx`

- [ ] **Step 1: فایل را بساز**

```tsx
'use client';

// src/app/(site)/(home)/designs/AfghanSlot.tsx
// slot چسبیده‌ی ابتدای تیکر برای نمایش ارزهای افغانستان.
// 2026-06-20: اضافه شد چون سایت متعلق به افغانستان است و
// افغانی/دلار افغانی/دلار هرات باید متمایز از سایر ارزها دیده بشن.

import type { MarketRateItem } from '@/actions/marketRates';
import { TbCurrencyAfghani } from 'react-icons/tb';
import { cn, toPersianNumber, formatNumber } from '@/lib/utils';

interface AfghanSlotProps {
  /** آیتم‌های مربوط به افغانستان: AFN, USD_HERAT, USD_AFG. */
  rates: MarketRateItem[];
  className?: string;
}

export default function AfghanSlot({ rates, className }: AfghanSlotProps) {
  if (rates.length === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-2 sm:gap-3 h-full px-3 sm:px-4 shrink-0',
        'bg-gradient-to-l from-emerald-700 via-emerald-800 to-emerald-900',
        'text-white shadow-inner',
        'border-l border-emerald-600/50',
        className,
      )}
      dir="rtl"
      aria-label="نرخ‌های افغانستان"
    >
      <TbCurrencyAfghani className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" aria-hidden />
      <span className="text-[10px] sm:text-[11px] font-bold tracking-wide whitespace-nowrap">
        افغانستان
      </span>
      <div className="flex items-center gap-2 sm:gap-3 divide-x divide-emerald-400/40 rtl:divide-x-reverse">
        {rates.map((r) => (
          <div key={r.symbol} className="flex items-center gap-1 sm:gap-1.5 ps-2 sm:ps-3 first:ps-0">
            <span className="text-[9px] sm:text-[10px] font-semibold opacity-80">
              {r.symbol === 'AFN' ? 'افغانی' : r.symbol === 'USD_HERAT' ? 'دلار هرات' : 'دلار افغانی'}
            </span>
            <span className="text-[11px] sm:text-[12px] font-bold tabular-nums">
              {toPersianNumber(formatNumber(Math.round(r.price)))}
            </span>
            {r.change !== 0 && (
              <span
                className={cn(
                  'text-[9px] tabular-nums font-semibold',
                  r.change >= 0 ? 'text-emerald-100' : 'text-rose-100',
                )}
              >
                {r.change >= 0 ? '+' : ''}
                {toPersianNumber(r.change.toFixed(2))}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /c/Users/Biotak/Desktop/FinancialMarket
npx tsc --noEmit 2>&1 | head -10
```

انتظار: بدون خطا.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/Biotak/Desktop/FinancialMarket
git add src/app/\(site\)/\(home\)/designs/AfghanSlot.tsx
git commit -m "feat(designs): add AfghanSlot component for sticky Afghanistan rates"
```

---

## Task 9: MarketRatesTickerBar — ایکون، badge، slot، duration جدید

**Files:**
- Modify: `src/app/(site)/(home)/designs/MarketRatesTickerBar.tsx`

- [ ] **Step 1: import‌ها را گسترش بده**

ابتدای فایل، بلاک import‌ها رو با این عوض کن:

```tsx
'use client';

import type { MarketRateItem } from '@/actions/marketRates';
import { InfiniteTicker } from '@/components/InfiniteTicker';
import { TickerShell } from '@/components/TickerShell';
import { cn, toPersianNumber, formatNumber } from '@/lib/utils';
import { Clock, Edit3, Radio, TrendingDown, TrendingUp } from 'lucide-react';
import { getCurrencyIcon } from '@/lib/currencyIcons';
import { type IconType } from 'react-icons';
import AfghanSlot from './AfghanSlot';

interface MarketRatesTickerBarProps {
  rates: MarketRateItem[];
  label?: string;
}
```

- [ ] **Step 2: منطق تفکیک و duration**

تابع `MarketRatesTickerBar` را با این نسخه عوض کن:

```tsx
const AFGHAN_SYMBOLS = new Set(['AFN', 'USD_HERAT', 'USD_AFG']);

export default function MarketRatesTickerBar({
  rates,
  label = 'بازارها',
}: MarketRatesTickerBarProps) {
  if (!rates || rates.length === 0) return null;

  // ارزهای افغانستان برای slot اختصاصی
  const afghanRates = rates.filter((r) => AFGHAN_SYMBOLS.has(r.symbol));
  // بقیه برای تیکر
  const tickerRates = rates.filter((r) => !AFGHAN_SYMBOLS.has(r.symbol));
  if (tickerRates.length === 0 && afghanRates.length === 0) return null;

  // کپی برای seamless loop
  const items = [...tickerRates, ...tickerRates];

  return (
    <TickerShell
      height="md"
      fadeSize="md"
      tone="glass"
      ariaLabel="نرخ‌های بازار"
      lead={
        <span className="flex items-center gap-1.5">
          <Radio className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">زنده</span>
        </span>
      }
    >
      {/* Afghan slot — چسبیده به ابتدای track (در RTL سمت راست) */}
      {afghanRates.length > 0 && <AfghanSlot rates={afghanRates} />}

      <InfiniteTicker duration={65} dir="rtl" pauseOnHover pauseOnHold>
        <div className="flex items-center divide-x divide-neutral-200/70 dark:divide-neutral-800/70">
          {items.map((rate, idx) => {
            const isPositive = rate.change >= 0;
            const formattedToman = toPersianNumber(formatNumber(Math.round(rate.price)));
            const Icon: IconType = getCurrencyIcon(rate.symbol);
            const isManual = rate.source === 'manual';
            const isDbFallback = rate.source === 'db-fallback';

            return (
              <div
                key={`${rate.symbol}-${idx}`}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 shrink-0"
              >
                {/* Currency icon */}
                <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neutral-500 dark:text-neutral-400 shrink-0" aria-hidden />

                {/* Symbol */}
                <span className="text-[12px] sm:text-[13px] font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                  {rate.symbol}
                </span>

                {/* Name (فارسی) */}
                <span className="hidden xs:inline sm:inline text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 truncate max-w-[6rem] sm:max-w-[8rem]">
                  {rate.name}
                </span>

                {/* Price */}
                <span className="text-[11px] sm:text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 tabular-nums">
                  {formattedToman}
                  <span className="text-[9px] text-neutral-600 dark:text-neutral-400 mr-0.5">
                    تومان
                  </span>
                </span>

                {/* Change */}
                {rate.change !== 0 && (
                  <span
                    className={cn(
                      'flex items-center gap-0.5 text-[10px] sm:text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-md',
                      isPositive
                        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/10'
                        : 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-500/10',
                    )}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    ) : (
                      <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    )}
                    {isPositive ? '+' : ''}
                    {toPersianNumber(rate.change.toFixed(2))}%
                  </span>
                )}

                {/* Source badge — manual */}
                {isManual && (
                  <span
                    className="hidden sm:inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    title={rate.manualUpdatedAt ? `دستی - ${rate.manualUpdatedAt.toLocaleString('fa-IR')}` : 'دستی'}
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                    دستی
                  </span>
                )}

                {/* Source badge — db-fallback */}
                {isDbFallback && typeof rate.ageMinutes === 'number' && (
                  <span
                    className="hidden sm:inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                    title={`آخرین نرخ ذخیره‌شده توسط cron`}
                  >
                    <Clock className="w-2.5 h-2.5" />
                    {toPersianNumber(rate.ageMinutes)} دقیقه پیش
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

- [ ] **Step 3: Typecheck**

```bash
cd /c/Users/Biotak/Desktop/FinancialMarket
npx tsc --noEmit 2>&1 | head -20
```

انتظار: بدون خطا.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/Biotak/Desktop/FinancialMarket
git add src/app/\(site\)/\(home\)/designs/MarketRatesTickerBar.tsx
git commit -m "feat(ticker): add currency icons, source badges, afghan slot, duration=65s"
```

---

## Task 10: marketRates.ts — اضافه کردن فیلدهای جدید به MarketRateItem

**Files:**
- Modify: `src/actions/marketRates.ts:26-32`

- [ ] **Step 1: Interface را گسترش بده**

`interface MarketRateItem` (خطوط ۲۶-۳۲) را با این عوض کن:

```ts
export interface MarketRateItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  source: MarketSource;
  /** فقط برای db-fallback */
  ageMinutes?: number;
  /** فقط برای manual */
  manualUpdatedAt?: Date;
}
```

- [ ] **Step 2: تابع load را به‌روز کن**

تابع `load` (خطوط ۳۴-۵۱) را با این عوض کن:

```ts
async function load(): Promise<MarketRateItem[]> {
  try {
    const result = await assembleFreeMarketRates();
    return result.items.map((it) => ({
      symbol: it.symbol,
      name: it.name,
      price: it.priceToman,
      change: it.change,
      source: it.source,
      ageMinutes: it.ageMinutes,
      manualUpdatedAt: it.manualUpdatedAt,
    }));
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('[freeMarketRates] assemble failed:', err);
    }
    return [];
  }
}
```

- [ ] **Step 3: Typecheck**

```bash
cd /c/Users/Biotak/Desktop/FinancialMarket
npx tsc --noEmit 2>&1 | head -10
```

انتظار: بدون خطا.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/Biotak/Desktop/FinancialMarket
git add src/actions/marketRates.ts
git commit -m "feat(marketRates): pass through ageMinutes and manualUpdatedAt"
```

---

## Task 11: Smoke test — بررسی بیلد و عملکرد

**Files:** هیچ — فقط اجرا

- [ ] **Step 1: Lint**

```bash
cd /c/Users/Biotak/Desktop/FinancialMarket
npm run lint 2>&1 | tail -20
```

انتظار: بدون خطای جدی. ممکنه warning برای `noExplicitAny` در فایل‌های تغییر نکرده ببینی که قابل چشم‌پوشیه.

- [ ] **Step 2: Build**

```bash
cd /c/Users/Biotak/Desktop/FinancialMarket
npm run build 2>&1 | tail -30
```

انتظار: build موفق بدون خطا.

- [ ] **Step 3: Manual test در dev**

```bash
cd /c/Users/Biotak/Desktop/FinancialMarket
npm run dev
```

سپس:

1. صفحه `/` رو باز کن → تیکر لود بشه با ایکون‌های کنار هر symbol ✓
2. اگه دیتابیس `AFN`/`USD_HERAT`/`USD_AFG` نداره → `<AfghanSlot>` رندر نمی‌شه (همون رفتار فعلی) ✓
3. در داشبورد `/dashboard/exchange-rates`، یک `ExchangeRate` با `manualActive=true` و `manualRate=72500` بساز → در `/` باید badge آبی «دستی» کنار نمایش داده بشه ✓

- [ ] **Step 4: Test db-fallback**

```bash
# dev server رو متوقف کن، env variable تنظیم کن، دوباره اجرا کن
cd /c/Users/Biotak/Desktop/FinancialMarket
TGJU_SCRAPER_ENABLED=false npm run dev
```

در `/` باید تیکر همچنان با badge زرد "X دقیقه پیش" نمایش داده بشه (از DB).

- [ ] **Step 5: Commit نهایی**

```bash
cd /c/Users/Biotak/Desktop/FinancialMarket
git status
git add -A
git commit -m "chore: final smoke verification complete" --allow-empty
```

---

## Self-Review Checklist

- [x] Spec coverage: هر ۶ هدف spec در tasks پوشش داده شد:
  1. ایکون اختصاصی → Task 3 + Task 9
  2. slot افغانستان → Task 8 + Task 9
  3. سرعت ۶۵ ثانیه → Task 9
  4. manual override → Task 1, 2, 5, 6, 7, 10
  5. db-fallback → Task 5 + Task 9 + Task 10
  6. normalize outlier → Task 4

- [x] Placeholder scan: همه‌ی stepها کد کامل دارن؛ هیچ "TBD" یا "TODO" نیست.

- [x] Type consistency:
  - `MarketSource`: در Task 5 تعریف شد، در Task 10 استفاده شد ✓
  - `FreeMarketItem.ageMinutes`: در Task 5 اضافه شد، در Task 9 استفاده شد ✓
  - `ExchangeRateData.manualRate`: در Task 2 اضافه شد، در Task 6 استفاده شد ✓
  - `MarketRateItem.ageMinutes` و `manualUpdatedAt`: در Task 10 اضافه شد، در Task 9 استفاده شد ✓
  - `getCurrencyIcon`: در Task 3 export شد، در Task 9 import شد ✓

- [x] هر task یک commit مستقل داره (frequent commits ✓)

- [x] فایل‌های جدید isolated هستن (`AfghanSlot.tsx`, `currencyIcons.ts`) — هر کدوم یک مسئولیت واحد
