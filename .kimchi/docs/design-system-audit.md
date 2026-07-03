# گزارش سلامت Design System — پروژه Premium Public Pages Redesign

## 1. Executive Summary

سیستم Design Tokens پروژه در حال حاضر دو‌سر است: فایل `tokens.css` به‌عنوان Source of Truth طراحی شده، اما `globals.css` بخش بزرگی از همان مفاهیم را دوباره تعریف و override می‌کند. در عمل، تیم روی `globals.css` متکی است و `tokens.css` کم‌استفاده مانده است. این وضعیت برای فاز Token Unification ریسک اصلی محسوب می‌شود.

- **تعداد فایل‌های مرتبط با Design Tokens:** `src/app/globals.css` (~7,740 خط)، `src/components/ds/styles/tokens.css` (125 خط)
- **تداخل توکن:** `--ds-radius-md`, `--ds-duration-fast`, `--ds-border-subtle`, `--ds-surface`, `--ds-canvas` و غیره در هر دو فایل تعریف شده‌اند.
- **پوشش کامپوننت:** `shadcn/ui` کامل نصب است (37 فایل)؛ کامپوننت‌های `ds` محدود و کم‌استفاده هستند.
- **بدهی arbitrary value:** 193 فایل کامپوننت از مقادیر براکتی Tailwind استفاده می‌کنند.

## 2. Current Token Architecture

### 2.1 توزیع تعاریف توکن

| منبع | خطوط | نقش فعلی | مشکل |
|------|------|---------|------|
| `src/app/globals.css` | ~7,740 | Source of Truth عملی | حجیم، حاوی duplicate و override |
| `src/components/ds/styles/tokens.css` | 125 | Source of Truth طراحی‌شده | کم‌استفاده؛ بخشی در `globals.css` بازنویسی شده |

`globals.css` در ابتدا `tokens.css` را import می‌کند، اما سپس در بلوک‌های `@theme` و `:root`/`.dark` همان `--ds-*` توکن‌ها را دوباره تعریف می‌کند.

### 2.2 ماتریس تکرار (Duplication Matrix)

| گروه توکن | تعریف‌شده در `tokens.css` | تعریف‌شده در `globals.css` | وضعیت |
|-----------|---------------------------|----------------------------|-------|
| `--ds-radius-*` (sm, md, lg, xl, full) | بله | بله | تداخل کامل |
| `--ds-duration-*` (fast, normal, slow) | بله | بله | تداخل کامل |
| `--ds-border-subtle` | بله | بله | تداخل |
| `--ds-surface`, `--ds-canvas` | بله | بله | تداخل |
| `--color-*` (primary, secondary, neutral scales) | خیر | بله | فقط در `globals.css` |
| Semantic tokens (`background`, `foreground`, `card`, `border`) | خیر | بله | فقط در `globals.css` |
| Spacing, typography, shadows, motion, weights (`--ds-*`) | بله | بخشی | ناقص/متناقض |

### 2.3 توصیه Source of Truth

1. `tokens.css` را به Source of Truth رسمی تبدیل کن.
2. تمام `--ds-*` و `--color-*` توکن‌ها را در `tokens.css` متمرکز کن.
3. `globals.css` فقط import کند و override نکند.
4. برای Semantic tokens یک لایه جداگانه (`semantic.css` یا درون `tokens.css`) تعریف کن.

## 3. Component Coverage

### 3.1 shadcn/ui Primitives

**37 فایل** در `src/components/ui` موجود است:

`alert`, `avatar`, `badge`, `button`, `calendar`, `card`, `checkbox`, `command`, `dialog`, `dropdown-menu`, `form`, `input`, `label`, `popover`, `progress`, `scroll-area`, `select`, `separator`, `sheet`, `skeleton`, `switch`, `table`, `tabs`, `textarea`, `toast`, `toggle`, `toolbar`, `tooltip`, `typography`

به‌علاوه کامپوننت‌های سفارشی: `PersianDatePicker`, `CustomSwitch` و چند مورد دیگر.

### 3.2 DS Primitives & Patterns

| مسیر | موجود |
|------|-------|
| `src/components/ds/primitives` | `Card`, `Chip`, `IconButton`, `Pill`, `SearchField`, `SegmentedControl` |
| `src/components/ds/patterns` | `EmptyState`, `Skeleton` |

### 3.3 Adoption Rate

- فقط **34 فایل** در `src/` به `--ds-*` توکن‌ها ارجاع می‌دهند.
- 193 فایل کامپوننت از arbitrary values Tailwind استفاده می‌کنند.
- نتیجه: Adoption رسمی Design System پایین است؛ بیشتر UI روی `globals.css` + arbitrary values بنا شده است.

## 4. Arbitrary Value Debt

- **تعداد فایل‌های با arbitrary values:** 193 فایل کامپوننت
- **الگوهای رایج:** `bg-[...]`, `text-[...]`, `border-[...]`, `w-[...]`, `h-[...]`
- **مثال خطر:** هر جایگزینی رنگ یا spacing در آینده نیاز به یافتن و ویرایش دستی این مقادیر دارد.

**ریسک:**
- مقیاس‌پذیری پایین در dark mode
- افزایش حجم CSS نهایی
- امکان ایجاد inconsistency بین صفحات
- دشواری در اعمال تغییرات سراسری (Find & Replace غیرقابل اطمینان)

## 5. Key Risks

| ریسک | شدت | توضیح |
|------|-----|-------|
| Maintenance | بالا | دو منبع توکن => هر تغییر باید در دو جا بررسی شود |
| Inconsistency | بالا | arbitrary values و overrideهای محلی باعث پراکندگی استایل می‌شوند |
| Dark Mode | متوسط | semantic tokens متمرکز نیستند؛ ریسک شکست در dark mode وجود دارد |
| Performance | متوسط | `globals.css` 7,740 خطی => افزایش زمان پردازش CSS و سخت‌تر شدن tree-shaking |
| Onboarding | متوسط | توسعه‌دهنده نمی‌داند از `tokens.css` استفاده کند یا `globals.css` |

## 6. Recommended Next Steps

### 1. Token Unification (Highest Priority)
- `tokens.css` را منبع اصلی قرار بده.
- تمام `--ds-*` و `--color-*` را به `tokens.css` منتقل کن.
- از `@theme` در `globals.css` برای override دوباره استفاده نکن.

### 2. Audit & Replace Arbitrary Values
- لیست 193 فایل را به تدریج بررسی کن.
- هر arbitrary value را با توکن متناظر جایگزین کن.
- در صورت نبود توکن، آن را به `tokens.css` اضافه کن.

### 3. Semantic Token Layer
- لایه semantic مثل `background`, `foreground`, `card`, `border`, `muted` را رسمی کن.
- این لایه باید نقشه‌ای از `--color-*` به معانی UX باشد.

### 4. DS Adoption Plan
- کامپوننت‌های `ds/primitives` را گسترش بده.
- روی `Button`, `Input`, `Card`, `Badge` wrappers بنویس تا تیم از `shadcn/ui` خام استفاده نکند.

### 5. Lint/Guardrails
- قانون ESLint/Tailwind برای ممنوعیت arbitrary values جدید اضافه کن.
- اسکریپت دوره‌ای برای شمارش `bg-[`, `text-[` و گزارش regression.

---

**تهیه‌شده برای:** Ferment "Premium Public Pages Redesign" — Phase 1 Step 3  
**هدف:** آماده‌سازی زمینه برای فاز Token Unification
