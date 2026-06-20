# Spec — Dashboard Exchange Rates Redesign

**تاریخ:** ۲۰۲۶-۰۶-۲۰
**وضعیت:** Draft (awaiting approval)
**مسئول:** Principal Frontend Architect
**صفحه:** `/dashboard/exchange-rates`

---

## ۱. چرا صفحهٔ فعلی مشکل دارد

### ۱.۱ مشکلات بصری (از web page element dump)

| # | مشکل | تأثیر |
|---|------|------|
| B1 | کنتراست رنگ متن بسیار کم (`#F0F2F6` روی `#FFFFFF` با نسبت ≈ 1.04) | WCAG fail — متن خاکستری‌روشن روی سفید اصلاً خوانده نمی‌شود |
| B2 | عنوان «افزودن نرخ جدید» با `<h3 class="text-lg font-bold">` در کنار تیتر صفحه (`<h1 class="text-2xl font-bold">`) هیچ سلسله‌مراتبی ندارد | هر دو یک اندازه و وزن، چشم نمی‌داند کدام اصلی است |
| B3 | جدول ۲۲ ردیف + ۸ ستون در viewport 379px → اسکرول افقی وحشتناک | موبایل عملاً غیرقابل استفاده |
| B4 | ستون `مقدار` فقط `—` (به‌علت اینکه DB هنوز مهاجرت نشده) | یعنی جدول بی‌معناست |
| B5 | دکمه «ذخیره» به‌صورت `bg-emerald-600` در پایین یک فرم بلند، بدون توضیح | Visual hierarchy ضعیف |
| B6 | استایل فرم ترکیبی از raw Tailwind (`px-3 py-2 border rounded-lg`) بدون استفاده از Design System | ناسازگار با بقیهٔ پنل |

### ۱.۲ مشکلات UX

| # | مشکل | راه‌حل پیشنهادی |
|---|------|-----------------|
| U1 | کاربر برای پیدا کردن یک نرخ باید جدول را اسکرول کند | فیلتر + جست‌وجو + گروه‌بندی |
| U2 | فرم «افزودن» یکی‌یکی فیلدها را نشان می‌دهد، کاربر باید بداند کدام فیلد برای چیست | ۲-step wizard یا Stepper: «انتخاب از TGJU» → «تنظیمات» |
| U3 | مقدار فعلی نمایش داده نمی‌شود → ادمین نمی‌فهمد TGJU درست کار می‌کند یا نه | نمایش `lastValue` از TGJU در کنار نرخ DB، با delta |
| U4 | هیچ عملی روی ردیف‌ها نیست (ویرایش/حذف/تست‌فچ) | اکشن‌های inline در هر ردیف |

### ۱.۳ مشکلات فنی

| # | مشکل | ریسک |
|---|------|------|
| F1 | استفاده از `<table>` خام به‌جای `<Table>` از shadcn | با سیستم طراحی ناسازگار |
| F2 | Magic numbers (`space-y-8`, `p-4`) بدون token | بازنویسی دشوار |
| F3 | `DiscoveryDropdown` بدون keyboard navigation و بدون ARIA combobox | غیرقابل استفاده با صفحه‌خوان |
| F4 | `dynamic = 'force-dynamic'` → هر درخواست query به DB | بعد از deploy با لود بالا مشکل |

---

## ۲. چشم‌انداز طراحی

### ۲.۱ اصول (از قوانین پروژه)

- **سلسله‌مراتب آشکار:** یک تیتر صفحه (`h1`) + یک subhead توضیحی + یک primary action
- **Progressive Disclosure:** ابتدا overview (StatCards) → لیست (جدول هوشمند) → جزییات (drawer)
- **از شلوغی‌زدایی:** فقط یک CTA اولیه در هر بخش، اکشن‌های ثانویه در منوی ردیف
- **شفافیت داده:** ادمین باید فوراً ببیند TGJU/USDT چه مقداری برگرداند و DB چه دارد
- **هم‌نوایی با DS:** استفاده از `tokens.css` (OKLCH, fluid spacing) + کامپوننت‌های `src/components/ds/`

### ۲.۲ Layout (Desktop ≥1024px)

```
┌─────────────────────────────────────────────────────────────────┐
│ Sidebar │   Header                                               │
│         ├──────────────────────────────────────────────────────────┤
│         │  [Eyebrow: بازارها]                                       │
│         │  H1: نرخ‌های بازار                                        │
│         │  Subhead: مدیریت ۲۲ نرخ فعال · ۱۰ دقیقه پیش از TGJU      │
│         │                                                          │
│         │  ┌─── StatCard ──┐ ┌── StatCard ──┐ ┌── StatCard ──┐   │
│         │  │  فعال       │ │  خودکار TGJU │ │  دستی      │   │
│         │  │  ۲۲          │ │  ۱۹           │ │  ۴          │   │
│         │  └─────────────┘ └─────────────┘ └────────────┘   │
│         │                                                          │
│         │  ┌── Toolbar ─────────────────────────────────────┐     │
│         │  │ Search │ Group: همه ▼ │ Source: همه ▼ │ افزودن│     │
│         │  └──────────────────────────────────────────────┘     │
│         │                                                          │
│         │  ┌── جدول ─────────────────────────────────────────┐   │
│         │  │ # │ نام │ نماد │ مقدار │ منبع │ وضعیت │ ⋯ │   │
│         │  └────────────────────────────────────────────────┘   │
│         └──────────────────────────────────────────────────────────┘
```

### ۲.۳ Drawer (برای افزودن/ویرایش)

از راست (RTL) به داخل اسلاید می‌شود. عرض 480px در دسکتاپ، full-screen در موبایل.

**Step 1 — Discovery:** جست‌وجوی TGJU (Command Palette style با keyboard nav)
**Step 2 — Configure:** تنظیمات auto/manual، اولویت، فعال/غیرفعال
**Step 3 — Review:** پیش‌نمایش قبل از ذخیره

---

## ۳. ساختار کامپوننت

### ۳.۱ فایل‌های جدید

```
src/app/dashboard/exchange-rates/
├── page.tsx                          (Server Component — refactor)
├── loading.tsx                       (Skeleton بهتر)
└── _components/
    ├── ExchangeRatesHeader.tsx       (H1 + subhead + StatCards)
    ├── ExchangeRatesToolbar.tsx      (Search + filter chips + CTA)
    ├── ExchangeRatesTable.tsx        (جدول با sorting/filtering client-side)
    ├── ExchangeRateRow.tsx           (یک ردیف با hover-reveal actions)
    ├── RateEditorDrawer.tsx          (3-step drawer)
    ├── DiscoveryCommand.tsx          (Cmd+K style search — جایگزین DiscoveryDropdown)
    ├── SourceBadge.tsx               (auto/manual با رنگ متمایز)
    └── ValueCell.tsx                 (مقدار DB + delta از TGJU)
```

### ۳.۲ استفاده از DS موجود

- `Card` از `src/components/ds/primitives/Card`
- `Pill` از `src/components/ds/primitives/Pill`
- `Chip` از `src/components/ds/primitives/Chip`
- `SearchField` از `src/components/ds/primitives/SearchField`
- `SegmentedControl` از `src/components/ds/primitives/SegmentedControl`
- `EmptyState` از `src/components/ds/patterns/EmptyState`
- همهٔ spacing از `tokens.css` (`var(--ds-space-*)`)
- همهٔ رنگ‌ها از `tokens.css` (`var(--ds-brand-*)`, `--ds-accent-*`)

### ۳.۳ State Management

- Server-side: `getExchangeRateList()` (همان الان) — با `revalidate = 30` به‌جای `force-dynamic`
- Client-side: filter/search/sort در URL query params (`?q=...&group=...`) تا bookmarkable باشد
- Drawer state: `nuqs` یا `useState` ساده

---

## ۴. جزییات بصری

### ۴.۱ رنگ‌ها (از tokens.css)

| نقش | Light | Dark |
|------|------|------|
| Canvas | `--ds-canvas: oklch(99% 0.003 240)` | `oklch(15% 0.01 250)` |
| Surface (Card) | `--ds-surface: oklch(100% 0 0 / 0.7)` + blur | `oklch(20% 0.012 250 / 0.7)` + blur |
| Text Primary | `oklch(20% 0.01 240)` (contrast 16:1) | `oklch(95% 0.005 240)` (contrast 15:1) |
| Brand | `--ds-brand-500: oklch(55% 0.10 235)` | `oklch(65% 0.10 235)` |
| Success (auto) | `--ds-accent-emerald: oklch(60% 0.10 165)` | همان |
| Manual | `--ds-accent-amber: oklch(72% 0.13 70)` | همان |
| Inactive | `--ds-text-muted: oklch(55% 0.01 240)` | همان |

### ۴.۲ تایپوگرافی

- H1 صفحه: `var(--ds-text-3xl)` + `font-extrabold` + `tracking-tight`
- Subhead: `var(--ds-text-base)` + `text-secondary`
- Eyebrow: `var(--ds-text-xs)` + uppercase + tracking `[0.08em]` + brand color
- جدول header: `var(--ds-text-xs)` + uppercase + `text-muted`
- جدول cell: `var(--ds-text-sm)` + tabular-nums برای اعداد

### ۴.۳ Spacing

- Page padding: `var(--ds-space-6)` (≈24px در دسکتاپ، 16px در موبایل)
- بین StatCards: `var(--ds-space-4)` (16px)
- Toolbar padding: `var(--ds-space-3)` vertical
- بین ردیف‌های جدول: `var(--ds-space-3)` row height با hover state

### ۴.۴ Radius / Shadow

- Card: `--ds-radius-lg` (1rem) + `--ds-shadow-sm`
- Toolbar: `--ds-radius-md` (0.75rem) + border بدون shadow
- StatCard: `--ds-radius-lg` + `--ds-shadow-sm`
- Drawer: `--ds-radius-2xl` از سمت راست (RTL)
- Pill/SourceBadge: `--ds-radius-full` (pill)

---

## ۵. تعاملات و Motion

### ۵.۱ Animation

- Drawer slide-in از راست: `transform: translateX(0)` از `100%` با `--ds-ease-out-quart` (600ms)
- Row hover: background fade در `--ds-duration-fast` (180ms)
- StatCard reveal on mount: opacity + translateY(8px) → 0 با stagger 50ms
- Filter apply: smooth scroll-to-top اگر فیلتر باعث خالی شدن شد

### ۵.۲ Keyboard

- `Cmd/Ctrl + K` → باز کردن DiscoveryCommand
- `/` → focus search
- `↑/↓` → navigation در جدول و command
- `Enter` → ویرایش ردیف فعال
- `Esc` → بستن drawer
- `Tab` → ترتیب منطقی (search → filter → CTA → جدول)

### ۵.۳ ARIA

- جدول: `<table role="grid">` با `aria-rowcount` و `aria-sort`
- Source badge: `aria-label="منبع خودکار از TGJU"`
- Drawer: `role="dialog"` + `aria-labelledby` + focus trap
- Live region برای toast پس از save

---

## ۶. Responsive

| Breakpoint | رفتار |
|-----------|------|
| < 640px (موبایل) | StatCards در 1 column، جدول به لیست کارت تبدیل می‌شود (هر ردیف = کارت افقی با مقدار بزرگ)، Drawer full-screen |
| 640-1024px (تبلت) | StatCards در 2 column، جدول با sticky header و افقی اسکرول فقط در صورت لزوم |
| ≥ 1024px (دسکتاپ) | Layout کامل، Drawer 480px عرض |

---

## ۷. سازگاری با Backend

### ۷.۱ API های موجود (بدون شکستن)

- `getExchangeRateList()` — استفاده می‌شود
- `getMarketRates()` — استفاده می‌شود (cache 60s)
- `createMarketRate()` — استفاده می‌شود
- `updateMarketRate()` — **اضافه می‌شود** (اکشن ویرایش)
- `deleteMarketRate()` — **استفاده می‌شود** (اکشن حذف)
- `/api/market-rates/tgju-symbols` — استفاده می‌شود (برای DiscoveryCommand)

### ۷.۲ اکشن‌های جدید لازم؟

- `bulkRefresh()` — POST `/api/cron/refresh-market-rates` با admin auth (برای دکمهٔ «بروزرسانی»)
- `toggleActive()` — soft toggle بدون refresh کل

---

## ۸. معیارهای پذیرش (Acceptance Criteria)

1. **کنتراست:** همهٔ متن‌ها حداقل WCAG AA (4.5:1 برای body، 3:1 برای large)
2. **بدون جدول در موبایل:** در < 640px جدول به لیست کارت تبدیل می‌شود
3. **بدون scroll افقی در دسکتاپ** با viewport ≥ 1024px
4. **مقدار واقعی نمایش داده شود** — اگر DB مقدار ندارد، با `—` کم‌رنگ‌تر (نه متن اصلی)
5. **فیلترینگ** در URL persisted (shareable link)
6. **Keyboard accessible** — تمام اکشن‌ها با Tab قابل دسترسی
7. **Performance** — LCP < 2.5s، INP < 200ms، CLS < 0.1
8. **Migration** — `prisma migrate dev` موفق اجرا شود (پیش‌نیاز: migration قبلاً اضافه شده)
9. **No regression** — بقیهٔ داشبورد (posts, users, categories) بدون تغییر باقی بمانند

---

## ۹. ریسک‌ها

| ریسک | احتمال | تأثیر | کاهش |
|------|--------|-------|------|
| داده‌های DB هنوز ناقص (مقدار خالی) | بالا | متوسط | graceful fallback با اسکلتون + placeholder |
| `useTickerPause` تداخل با drawer focus trap | پایین | بالا | mount drawer در Portal جدا |
| Hydration mismatch در جدول (RTL) | متوسط | پایین | suppressHydrationWarning یا client-only flag |

---

## ۱۰. تغییرات Backend مورد نیاز

این spec فقط frontend را پوشش می‌دهد. Backend changes که قبلاً انجام شده:

- ✅ `getExchangeRateList()` موجود
- ✅ `createMarketRate()` موجود
- ✅ `updateMarketRate(id, input)` موجود (نیاز به بک‌اند احراز هویت — قبلاً هست)
- ✅ `deleteMarketRate(id)` موجود

**Migration پیش‌نیاز:** `20260620120000_add_exchange_rate_registry_fields` (قبلاً نوشته شده ولی هنوز اجرا نشده).

---

## ۱۱. خروجی Production

- همهٔ فایل‌های جدید در `src/app/dashboard/exchange-rates/_components/`
- `page.tsx` بازنویسی می‌شود (Server Component)
- هیچ تغییری در actions یا schema
- هیچ breaking change در routes یا contracts

---

**منتظر تأیید شما هستم قبل از شروع پیاده‌سازی.**
