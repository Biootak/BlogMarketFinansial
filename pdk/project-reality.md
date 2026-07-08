# بخش ۰ — تحلیل واقعیت ریپو (Project Reality / Stage 1)

> این ماژول پاسخ به چالش «آیا PDK را با پروژه بررسی کردی؟» است. اینجا وضعیت **واقعی** `E:\FinancialMarket` مستند شده تا PDK با آن آشتی یابد.
> **تصمیم کاربر:** (۱) گسترش همین ریپو به فین‌تک افغانستان. (۲) رابط دوزبانه (فارسی + دری/پشتو) + AFN.

## ۰.۱ این ریپو چیست؟
یک **بلاگ مالی فارسی** (`fullstack-blog`، هدف blogmarketfinansial.ir) با نمایش اطلاعات مالی (نرخ ارز، مقایسه صرافی). **نه** یک پلتفرم فین‌تک.

## ۰.۲ استک (تأییدشده از package.json / تنظیمات)
- Next.js **16.2.9** (App Router)، React 19، TypeScript 5.7 ✅
- Tailwind CSS **4** (CSS-first؛ `tailwind.config.js` خالی است) ✅
- Prisma **6** + PostgreSQL، `@prisma/client` singleton ✅
- NextAuth v5 (beta) + `@auth/prisma-adapter` ✅
- Radix UI (مجموعه کامل)، `class-variance-authority` (CVA) ✅
- Zod، react-hook-form، @upstash/ratelimit + @upstash/redis ✅
- Sentry، SWR، Zustand، TipTap (ادیتور)، recharts/react-chartjs-2

## ۰.۳ Design System موجود (بسیار مهم — قانون C12)
منبع حقیقت توکن‌ها: **`src/components/ds/styles/tokens.css`** (از `globals.css` import می‌شود).
- رنگ‌بندی **OKLCH کم‌اشباع** (نه بنفش slop).
- **برند anchor:** indigo/periwinkle `#5E6AE6` (`--color-primary-500: rgb(94,106,230)`).
- کامپوننت‌های آماده در `src/components/ui/` (shadcn-style روی Radix): button, card, input, dialog, badge, skeleton, table, stat-card, sheet, tooltip, toast, tabs, select, switch, checkbox, avatar, …
- **Motion:** کاملاً CSS-driven (بدون framer-motion)، `@property` gradient، scroll-driven animations، `prefers-reduced-motion` رعایت شده.
- **RTL:** logical properties + قانون `useDirection('rtl')` در `@/hooks/useDirection` (واقعی و استفاده‌شده).
- فونت: **Vazirmatn** (فارسی)، تبدیل عدد فارسی (`src/lib/fa-number.ts`, `persian-dictionary.ts`).
- کدهای حرفه‌ای: نظرات فارسی دقیق روی اندیس‌ها و تصمیمات (مثلاً bump base به ۱۶px برای هماهنگی با Linear/Stripe).

**نتیجه:** سیستم طراحی فعلی **از نظر بصری تخصصی و غیر AI-Slop** است. PDK نباید سیستم رقیب (مثل زعفران) پیشنهاد دهد؛ باید روی آن **بنا شود**.

## ۰.۴ دارایی‌های قابل بازاستفاده (Reuse — C12)
- `src/components/ui/*` — کل پایه UI.
- `src/components/ds/*` — توکن‌ها و utilityهای طراحی.
- `lib/db.ts` (Prisma singleton)، `lib/auth/*` (NextAuth)، `lib/ratelimit` (Upstash)، `lib/revalidate`.
- `useDirection` hook برای RTL.
- زیرساخت cache (`unstable_cache` + tags)، Sentry، i18n-style number formatting.

## ۰.۵ شکاف‌ها (Gaps) — آنچه برای فین‌تک کم است
1. **هیچ لایه مالی واقعی نیست:** schema شامل `User/Account/Session/Notification/ActivityLog/TransferProvider/ExchangeRate/ServiceRequest` است — اما **هیچ `Wallet` / `LedgerEntry` / `Transaction` / `Balance`** ندارد. `money-transfer` فقط **جدول مقایسه نرخ** است (TransferProvider registry + calculator)، نه انتقال پول.
2. **RBAC مالی ندارد:** `Role` enum فعلی `USER/AUTHOR/ADMIN/OWNER` است (بلاگی) — نیاز به `customer/merchant/exchange/support` + دسترسی دانه‌ای.
3. **i18n وجود ندارد:** زبان سخت‌کد `fa_IR`/`fa` است. برای دوزبانه (فارسی + دری/پشتو) باید لایهٔ locale اضافه شود (next-intl یا dictionaries).
4. **ارز/تقویم:** تومان/ریال + جلالی. برای AFN + احتمالاً میلادی/شمسی افغان نیاز به تطبیق `fa-number` / فرمت‌کننده‌ها.
5. **احراز بانکی:** NextAuth هست اما Passkey/WebAuthn + ۲FA دانه‌ای + مدیریت دستگاه/audit مالی نیست.
6. **Fraud detection / manual review queue / audit log مالی** ندارد.

## ۰.۶ تضادهای PDK با واقعیت (و تصمیم اصلاح)
| مورد در PDK | واقعیت ریپو | تصمیم |
|------------|------------|-------|
| زبان دری/پشتو ONLY | فارسی سخت‌کد | **دوزبانه** (فارسی + دری/پشتو) — این ریپو پایه فارسی می‌ماند + لایهٔ دری/پشتو |
| برند زعفران/فیروزه (Tier-3) | برند ایندیگو OKLCH موجود | **حفظ برند ایندیگو**؛ Tier-3 فقط در صورت بازبرندینگ |
| ساختار `features/` greenfield | ریپو دارای `app/(site)`, `app/dashboard`, `src/components` | افزودن مسیرهای فین‌تک در کنار بلاگ (مثلاً `app/(dashboard)/wallet`) |
| دیتابیس از صفر | schema بلاگی غنی | **تمدید schema** (افزودن مدل‌های مالی) نه جایگزینی |
| design system از صفر | `src/components/ds` آماده | **توسعهٔ DS موجود** + لایهٔ فین‌تک |

## ۰.۷ نقشهٔ آشتی (Reconciliation Plan)
1. **طراحی:** هر صفحه فین‌تک از توکن‌های `src/components/ds` و کامپوننت‌های `src/components/ui` شروع کند؛ لایهٔ فین‌تک (AFN، semantics مالی، bilingual numerals) روی آن اضافه شود. چرخه طراحی (design-cycle.md) روی صفحات **جدید** اجرا شود.
2. **معماری:** ماژول‌های فین‌تک به صورت route group جدید (`(fintech)`) در کنار بلاگ؛ اشتراک `lib/db`, `lib/auth`, `lib/ratelimit`.
3. **دیتابیس:** افزودن `Wallet`, `LedgerEntry`, `Transaction`, `Device`, `Permission/RolePermission`؛ تمدید `Role`.
4. **i18n:** انتخاب رویکرد (next-intl پیشنهادی) و لایهٔ dictionaries فارسی/دری/پشتو.
5. **امنیت:** افزودن Passkey/۲FA، RBAC دانه‌ای، audit log مالی روی زیرساخت موجود.

> این ماژول «منبع حقیقت وضعیت ریپو» است. پیش از هر کار طراحی/کد در فین‌تک، ابتدا `src/components/ds/styles/tokens.css` و `src/components/ui` را بخوان.
