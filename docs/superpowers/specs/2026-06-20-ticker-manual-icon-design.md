# طراحی: ارتقای تیکر بازار آزاد (ایکون، Slot افغانستان، Manual Override، DB Fallback)

- **تاریخ**: ۲۰۲۶-۰۶-۲۰
- **نویسنده**: ZCode (brainstorming)
- **وضعیت**: Approved (در انتظار implementation plan)

## ۱. زمینه و مسئله

تیکر بالای اسلایدر اصلی (`MarketRatesTickerBar` در `src/app/(site)/(home)/designs/`) در حال حاضر فقط متن و عدد نمایش می‌ده و چند مشکل دارد:

1. **فاقد ایکون/لوگو** برای هر ارز — برای کاربران افغان/ایرانی که با نرخ لحظه‌ای زندگی می‌کنن، تشخیص سریع هر ارز سخت‌تره.
2. **ارزهای افغانستان** (افغانی، دلار افغانی، دلار هرات) در حال حاضر اصلاً در لیست `WANTED_CANONICAL` نیستن و هیچ نمایش ویژه‌ای ندارن — در حالی که سایت متعلق به افغانستانه.
3. **سرعت اسکرول** ۴۰ ثانیه‌ست — برای خواندن عدد تومانی و درصد تغییر، کاربر باید track رو متوقف کنه.
4. **manual override نداره**: اگه ادمین بخواد نرخ یک ارز رو دستی ثابت نگه داره (مثلاً صرافی خاص کابل)، راهی نیست.
5. **DB fallback ضعیف**: اگه TGJU و USDT هر دو شکست بخورن، تیکر کلاً مخفی می‌شه. در حالی که cron هر ۱۰ دقیقه DB رو به‌روز می‌کنه و می‌شه با یک badge "آخرین نرخ ذخیره‌شده" نشون داد.
6. **اعشار TGJU**: درصد تغییر گاهی مقادیر غیرعادی (outlier) برمی‌گردونه.

## ۲. اهداف

1. هر ارز در تیکر **ایکون اختصاصی** داشته باشه (Tabler از `react-icons/tb` — بدون dependency جدید).
2. **slot چسبیده‌ی افغانستان** در ابتدای تیکر با پس‌زمینه‌ی متمایز (سبز پرچم افغانستان) و ایکون `TbCurrencyAfghani`.
3. **سرعت اسکرول ۶۵ ثانیه** برای یک دور کامل (به جای ۴۰ ثانیه‌ی فعلی).
4. **manual override** از داشبورد: ادمین بتونه نرخ یک ارز رو در جدول `ExchangeRate` قفل کنه (`manualRate` + `manualActive`).
5. **fallback هوشمند به DB** وقتی TGJU + USDT هر دو شکست می‌خورن، با badge زرد "آخرین نرخ ذخیره‌شده X دقیقه پیش".
6. **normalize کردن outlier** در `change%` (اگه `|change| > 50`، صفر در نظر گرفته می‌شه).

## ۳. معماری

```
┌──────────────────────────────────────────────────────────────────────┐
│ assembleFreeMarketRates() (src/lib/freeMarketRates.ts)               │
│   ├─ 1) Load manual map from DB (ExchangeRate.manualActive + rate)  │
│   ├─ 2) Fetch TGJU (parallel)                                       │
│   ├─ 3) Fetch USDT (Exir) (parallel)                                │
│   ├─ 4) Fetch Global FX (parallel)                                  │
│   └─ 5) Load DB rows (parallel, for fallback)                       │
│                                                                      │
│   For each WANTED_CANONICAL:                                        │
│     if manual   → push with source='manual'                         │
│     elif TGJU    → push with source='tgju'                           │
│     elif USDT    → push with source='usdt'                           │
│     elif FX      → push with source='fx-derived'                     │
│     elif DB      → push with source='db-fallback' + ageMinutes       │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ MarketRatesTickerBar (client)                                       │
│   - <AfghanSlot/> (sticky, emerald-700 bg, TbCurrencyAfghani icon)  │
│   - <InfiniteTicker duration={65} dir="rtl">                        │
│       - items.map(render <CurrencyIcon/> + symbol + price + change)  │
│       - اگه source==='db-fallback' → badge زرد "X دقیقه پیش"        │
│       - اگه source==='manual' → badge آبی "دستی"                     │
└──────────────────────────────────────────────────────────────────────┘
```

## ۴. تغییرات کلیدی

### ۴.۱. `prisma/schema.prisma` — ستون‌های manual

```prisma
model ExchangeRate {
  id          String   @id @default(cuid())
  name        String   @unique
  currency    String
  rateType    RateType @default(BUY_SELL)
  buyRate     String?
  sellRate    String?
  singleRate  String?
  bulkRate    String?
  description String?
  imageUrl    String?
  // ─── 2026-06-20: manual override ──────────────────────────────────
  manualRate    String?  // null = استفاده از TGJU/USDT؛ غیر null = اولویت اول
  manualActive  Boolean  @default(false)
  manualNote    String?  // یادداشت ادمین (مثلاً "دلار هرات - صرافی کابل")
  manualUpdatedAt DateTime? // برای نمایش "آخرین ویرایش دستی"
  // ─────────────────────────────────────────────────────────────────
  updatedAt   DateTime @updatedAt
  createdAt   DateTime @default(now())
  @@index([createdAt(sort: Desc)])
}
```

**migration**: `npx prisma migrate dev --name add_manual_override_to_exchange_rate`

### ۴.۲. `src/lib/freeMarketRates.ts`

تغییرات:

- اضافه کردن `MarketSource = 'manual' | 'tgju' | 'usdt' | 'fx-derived' | 'db-fallback'`
- اضافه کردن فیلد `ageMinutes?: number` به `FreeMarketItem` (فقط برای db-fallback)
- اضافه کردن فیلد `manualUpdatedAt?: Date` (فقط برای manual)
- اضافه کردن `getManualMap()` که فقط ردیف‌هایی که `manualActive=true` و `manualRate > 0` دارن رو برمی‌گردونه
- اضافه کردن canonical‌های جدید به `WANTED_CANONICAL`:
  - `AFN` (افغانی)
  - `USD_HERAT` (دلار هرات — نگاشت به manual یا DB)
  - `USD_AFG` (دلار افغانی)
  - `IRR` (ریال ایران — اختیاری، اگه ادمین manual تعریف کنه)
- در حلقه‌ی اصلی، اولویت به این ترتیب:
  1. `manual` (اگه `manualActive=true`)
  2. `tgju`
  3. `usdt` (برای USD) یا `usdt-derived` از FX
  4. `db-fallback` (اگه `manual` نیست ولی DB ردیف داره)
- **normalize outlier**: اگه `|change| > 50`، `change = 0`

```ts
function normalizeChange(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  if (Math.abs(raw) > 50) return 0; // outlier از TGJU
  return Math.round(raw * 100) / 100; // حداکثر ۲ رقم اعشار
}
```

### ۴.۳. `src/lib/tgju.ts`

- در `parseRow`، خط `change` رو با `normalizeChange` بپیچیم (یا در `parseTgjuItem` در `freeMarketRates.ts`)
- هیچ تغییر دیگه‌ای نمی‌خواد.

### ۴.۴. `src/lib/currencyIcons.ts` (جدید)

```ts
// نگاشت symbol → ایکون از react-icons/tb
import {
  TbCurrencyDollar, TbCurrencyEuro, TbCurrencyPound, TbCurrencyAfghani,
  TbCurrencyIranianRial, TbCurrencyBitcoin, TbCurrencyEthereum, TbCurrencyTether,
  TbCurrencyLitecoin, TbCurrencyRipple, TbCurrencySolana, TbCurrencyDogecoin,
  TbCurrencyMonero, TbCoin,
  TbCurrencyYen, TbCurrencyYuan, TbCurrencyFrank, TbCurrencyDirham, TbCurrencyRiyal,
  TbCoinFilled,
} from 'react-icons/tb';
import { type IconType } from 'react-icons';

export const CURRENCY_ICON: Record<string, IconType> = {
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
  AFN: TbCurrencyAfghani,
  USD_HERAT: TbCurrencyAfghani, // visual hint برای ارزهای افغان
  USD_AFG: TbCurrencyAfghani,
  SEKKEH: TbCoin,
  BAHAR: TbCoin,
  NIM: TbCoin,
  ROB: TbCoin,
  GERAMI: TbCoin,
  GOLD18: TbCoin,
  ABSHODEH: TbCoin,
  OUNCE_GOLD: TbCoin,
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

### ۴.۵. `src/actions/exchange-rates.ts`

- گسترش Zod schema با `manualRate`/`manualActive`/`manualNote`/`manualUpdatedAt`
- در `createExchangeRate` و `updateExchangeRate`:
  - اگه `manualActive` تغییر کرده → `manualUpdatedAt = new Date()` (در update)
- revalidate تگ‌های `ticker`, `exchange-rates`, `dashboard-exchange-rates`

### ۴.۶. `src/types/types.ts`

```ts
export interface ExchangeRateData {
  // ... existing
  manualRate: string | null;
  manualActive: boolean;
  manualNote: string | null;
  manualUpdatedAt: Date | null;
}
```

### ۴.۷. `src/app/dashboard/exchange-rates/page.tsx`

اضافه کردن به فرم Create + Edit:

- فیلد `manualRate` (Input عددی)
- فیلد `manualActive` (Switch — قابل تغییر)
- فیلد `manualNote` (Input متن)

در جدول:
- یک ستون جدید با badge سبز "دستی" وقتی `manualActive=true`

### ۴.۸. `src/app/(site)/(home)/designs/AfghanSlot.tsx` (جدید)

یک sub-component که در ابتدای تیکر با `position: sticky` (یا فقط absolute positioning در RTL) نمایش داده می‌شه:

```tsx
'use client';
interface AfghanSlotProps {
  rates: MarketRateItem[]; // فقط AFN, USD_HERAT, USD_AFG
}

export default function AfghanSlot({ rates }: AfghanSlotProps) {
  if (rates.length === 0) return null;
  return (
    <div className="flex items-center gap-2 px-3 sm:px-4 h-full
                    bg-gradient-to-l from-emerald-700 to-emerald-800
                    text-white shrink-0 border-l border-white/10">
      <TbCurrencyAfghani className="w-4 h-4" />
      <span className="text-[11px] font-bold">افغانستان</span>
      {rates.map((r) => (
        <span key={r.symbol} className="flex items-center gap-1 text-[10px]">
          <span className="opacity-80">{r.symbol}</span>
          <span className="tabular-nums font-bold">
            {toPersianNumber(formatNumber(Math.round(r.price)))}
          </span>
        </span>
      ))}
    </div>
  );
}
```

### ۴.۹. `src/app/(site)/(home)/designs/MarketRatesTickerBar.tsx`

تغییرات:

- پذیرش `allRates: MarketRateItem[]` (یا همون `rates` فعلی)
- جداسازی `afghanRates = rates.filter(r => /AFN|USD_HERAT|USD_AFG/.test(r.symbol))`
- `duration={65}` (به جای ۶۰ فعلی)
- اضافه کردن `<CurrencyIcon symbol={rate.symbol} />` در کنار symbol (با `size={14}`)
- اگه `rate.source === 'db-fallback'` → badge زرد `Clock + "X دقیقه پیش"`
- اگه `rate.source === 'manual'` → badge آبی کوچک `Edit + "دستی"`
- در ابتدای track، `<AfghanSlot rates={afghanRates} />` (بیرون از InfiniteTicker)

### ۴.۱۰. `src/app/(site)/(home)/designs/Design7.tsx`

هیچ تغییر ساختاری لازم نیست — `<MarketRatesTickerBar rates={marketRates} />` همون props رو می‌گیره.

## ۵. خطاها و تست

### ۵.۱. سناریوهای رفتاری

| سناریو | رفتار فعلی | رفتار جدید |
|--------|------------|------------|
| TGJU موفق، manual غیرفعال | فقط TGJU | manual (نیست) → tgju ✓ |
| Manual فعال، TGJU متفاوت | وجود نداشت | manual اولویت اول ✓ |
| TGJU ناموفق، USDT موفق | USDT-derived | manual → usdt-derived ✓ |
| TGJU + USDT ناموفق، DB ردیف دارد | تیکر مخفی ❌ | db-fallback با badge "X دقیقه پیش" ✓ |
| Manual فعال، TGJU outage | manual | manual → tgju → db-fallback ✓ |
| TGJU outlier (change=120%) | عدد بزرگ نشون داده می‌شد | normalize به 0 ✓ |

### ۵.۲. تست‌ها (TDD)

پروژه test framework نداره (`jest`/`vitest` نصب نیست). تست‌ها به صورت **manual + smoke** در dev server اجرا می‌شن:

1. **Smoke test 1** (dev server):
   - `/` رو باز کن → تیکر لود بشه با ایکون‌ها ✓
   - slot افغانستان با ۰ آیتم (چون default DB خالیه) → `<AfghanSlot>` نباید رندر بشه ✓

2. **Smoke test 2** (manual override):
   - در داشبورد، یک `ExchangeRate` با `manualActive=true` و `manualRate=12345` بساز
   - `/` رو رفرش کن → در تیکر، badge آبی "دستی" و مقدار ۱۲۳۴۵ نمایش داده بشه ✓
   - حتی اگه TGJU مقدار متفاوتی بده، manual اولویت داشته باشه ✓

3. **Smoke test 3** (db-fallback):
   - `TGJU_SCRAPER_ENABLED=false` تنظیم کن و dev server رو ری‌استارت کن
   - در DB، `ExchangeRate.USD` رو دستی آپدیت کن (singleRate=99999)
   - `/` رو رفرش کن → تیکر نشون داده بشه با badge "X دقیقه پیش" و مقدار ۹۹۹۹۹ ✓

4. **Smoke test 4** (outlier):
   - در `parseRow`، یک مقدار تستی با `change=1234.5` تزریق کن
   - خروجی `change=0` باشه ✓

### ۵.۳. ریسک‌ها

| ریسک | شدت | راهکار |
|------|-----|--------|
| cache 60s → ادمین تغییر رو با تأخیر ببینه | پایین | قابل قبول؛ در آینده می‌شه revalidateTag بعد از save انجام داد (الان هم انجام می‌شه) |
| cron با manual تداخل پیدا کنه | پایین | manual اولویت داره پس cron بی‌اثره برای ارزهای manual-active |
| `position: sticky` در RTL مشکل داشته باشه | پایین | اگه نشد، absolute positioning با `inset-inline-start: 0` جایگزین |
| `react-icons/tb` در bundle size تأثیر بذاره | پایین | tree-shaking فعاله (هر ایکون فقط در صورت استفاده import می‌شه) |

## ۶. Rollback

- اگه مشکلی پیش اومد:
  1. migration رو revert کن (`npx prisma migrate resolve --rolled-back`)
  2. فایل‌های جدید (`AfghanSlot.tsx`, `currencyIcons.ts`) رو پاک کن
  3. `MarketRatesTickerBar` رو به نسخه‌ی قبلی برگردون (git revert)
- backward compatibility: اگه `manualRate=null` باشه (default)، همه چیز مثل قبل کار می‌کنه

## ۷. تأیید نهایی

- [x] Design با کاربر تأیید شد (۲۰۲۶-۰۶-۲۰)
- [ ] Implementation plan نوشته شد
- [ ] تست‌های smoke در dev اجرا شد
- [ ] Build بدون خطا (`npm run build`)

## ۸. یادداشت‌ها

- سایت متعلق به افغانستان است؛ slot افغانستان باید همیشه دیده بشه حتی اگه ۰ آیتم داشته باشه (با placeholder "—"). ولی اگه DB هیچ `AFN`/`USD_HERAT`/`USD_AFG` نداشته باشه، `<AfghanSlot>` کلاً رندر نمی‌شه (همون رفتار فعلی "missing rate hide").
- `duration={65}` انتخاب شد چون ۶۰ برای کاربر ایرانی/افغانی هنوز سریعه و ۷۰ خیلی کند می‌شه.
- `react-icons/tb` کاملاً در دسترسه (در پروژه از قبل نصبه).
