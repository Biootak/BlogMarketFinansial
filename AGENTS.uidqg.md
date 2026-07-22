# AGENTS.uidqg.md — UI Design Quality Gate (UIDQG)

> **بارگذاری:** فقط برای تسک‌هایی که فایل‌های UI/بصری تغییر می‌کنند.
> برای تسک‌های pure backend/DB → یک خط کافی است: `UIDQG: N/A — backend only`

---

## §Workflow — ساخت یک صفحه UI (ترتیب اجباری)

0. **UI VISION GATE:** جدول مستقل UI VISION GATE در `AGENTS.md` را پر کن (UQ1+UQ2+UQ3+Risk+CompMap). §Craft Bar را همین لحظه بخوان. اگر هر سطر خالی است → کد ممنوع.
1. **Audit:** کامپوننت‌های موجود برای المان‌های مورد نیاز را grep کن (`COMPONENTS.md` + repo).
2. **Research:** internet-first rule اگر surface non-trivial است.
3. **PRE-CODE GATE:** جدول اصلی PRE-CODE GATE را پر کن.
4. **Build:** با tokens + canonical components؛ همه states را handle کن (loading/empty/error/disabled/success).
5. **Self-check:** با `COMPONENTS.md` + `DESIGN.md` anti-patterns. `npx tsc --noEmit` + `npm run lint`.
6. **UIDQG کامل (UQ1–UQ22):** قبل از Show اجباری است. هر ❌ = همان لحظه fix کن.
7. **Show:** به کاربر نشان بده؛ بر اساس «fix» یا «good» iterate کن.

---

## چه موقع اجرا می‌شود؟ (دو مرحله‌ای — اجباری)

- **مرحله اول (قبل از کد):** جدول **UI VISION GATE** (مستقل، قبل از PRE-CODE GATE) + §Craft Bar خوانده شود.
- **مرحله دوم (قبل از Show/Done):** همه UQ1–UQ22 را اجرا کن و نتیجه را visible بنویس. §Craft Bar دوباره چک شود.

> ⛔ **VISIBLE OUTPUT اجباری است.** نوشتن "UIDQG انجام شد" بدون خروجی = نقض مستقیم.
> هر `❌` = همان لحظه fix کن → از UQ1 دوباره شروع کن.

---

## فرمت گزارش — نمونه کامل (اجباری)

```
🎨 UIDQG Result:
[UQ1]  ✅ — Stripe-level depth + stagger animation — مقایسه با Linear: قابل انتشار
[UQ2]  ✅ — System-breath SVG در hero section
[UQ3]  ✅ — فرم از نرخ‌های مالی می‌آید، نه کپی Stripe
[UQ4]  ✅ — تاریخ ۱۵/۴/۱۴۰۴، رفرنس: Linear dashboard + shadcn DataTable
[UQ5]  ✅ — Server Component با Suspense، client فقط برای interactive parts
[UQ6]  ⚠️ — inline edit بهتر بود ولی scope بزرگ‌تر — ثبت در post-task
[UQ7]  ✅ — همه ۶ state: loading/empty/error/success/disabled/partial
[UQ8]  ✅ — ۳ سطح visual weight، grid 12col با span متغیر
[UQ9]  ✅ — elevation tiers از --ds-shadow-sm تا --ds-shadow-lg
[UQ10] ✅ — spring stagger 40ms، enter/exit با framer-motion
[UQ11] ✅ — hover/press/focus روی همه interactive elements
[UQ12] ✅ — بدون neon/glow — فقط hairline + elevation
[UQ13] ✅ — فقط --at-* و --ds-* tokens، بدون hex
[UQ14] ✅ — DataTable از primitives، Dialog از shadcn، EmptyState از موجود
[UQ15] ✅ — h1: 32px/700، h2: 18px/600، body: 14px/400، tabular-nums روی اعداد
[UQ16] ✅ — space-8 بین sections، max-width 1200px، عناصر compact
[UQ17] ✅ — Server Component برای list، Server Actions برای mutations
[UQ18] ✅ — DetailDrawer + StatusBadge + CountBadge همه آپدیت شدند
[UQ19] ✅ — sidebar link موجود، widget tile آپدیت شد
[UQ20] ✅ — ServiceRequest type grep شد، ۵ consumer چک شدند
[UQ21] ⚠️ — CommandBar هنوز skeleton قدیمی دارد — ثبت در post-task
[UQ22] ✅ — redesign (نه rewrite): ساختار کلی خوب، فقط visual layer آپدیت شد
```

> فرمت پاسخ هر UQ: `✅ بله` / `❌ خیر` / `⚠️ جزئی` / `N/A — [دلیل]` + یک جمله توضیح.
> هر `❌` = همان لحظه fix کن → از UQ1 دوباره شروع کن.
> فقط وقتی همه ✅ یا N/A شدند → اعلام Show/Done مجاز است.

---

## بلاک A — هویت و استراتژی بصری (Vision) ⚡ اجباری در مرحله اول

> ⛔ **این بلاک در Vision-First (گام ۰) پیش از کد پاسخ داده می‌شود — نه فقط در مرحله دوم.**

**[UQ1]** آیا طراحی «بیلیون‌دلاری» است یا «معمولی/کسل‌کننده»؟
مقایسه با Wise/Linear/Stripe: اگر آن‌ها آن را منتشر نمی‌کردند = شکست. «درست است ولی ordinary» = شکست.
> پیش از کد بنویس: «این صفحه باید حس [X] بدهد — شبیه [Product] در لحظه [Y].»

**[UQ2]** آیا یک «لحظهٔ واو» (Signature Moment) وجود دارد؟
حداقل یک جزء به‌یادماندنی: ambient SVG stroke / System-breath / view-transition / stagger choreography.
> پیش از کد بنویس: «signature moment این صفحه: [...]»

**[UQ3]** آیا هویت بصری از «منطق دامنه» برمی‌خیزد؟
فرم از semantics مالی (نرخ/اعتماد/سرعت) می‌آید، نه کپی سطح‌بصری رقیب.
> پیش از کد بنویس: «هویت از [X در دامنه مالی] می‌آید، نه از کپی [Y].»

**[UQ4]** آیا با رفرنس‌های اینترنتی (2026) تحقیق شده؟
حداقل یک UI reference معتبر (shadcn، Layered-UI، Supabase، Linear) مطالعه شده + تاریخ visible.

---

## بلاک B — معماری و ساختار (Architecture)

**[UQ5]** آیا معماری درستی انتخاب شده؟
Server Component vs Client Component؛ data-fetching روی server؛ Suspense/Streaming بررسی شد.

**[UQ6]** آیا می‌توان صفحه را جوری دیگر نوشت که کاربر راحت‌تر باشد؟
Task flow کاربر بررسی شد؟ «کمترین click» برای هر عمل؟ information architecture منطقی است؟

**[UQ7]** آیا کارایی لازم دارد که پیاده نشده؟
تمام use-case های ممکن کاربر + edge cases + error paths. همه states: loading/empty/error/success/disabled.

---

## بلاک C — پیچیدگی خوش و طراحی ممتاز (Craft)

**[UQ8]** آیا چیدمان المان‌ها پیچیدهٔ خوش دارند (نه یکنواخت)?
سلسله‌مراتب بصری واضح؛ حداقل ۲ سطح visual weight در هر section؛ grid بدون تنوع = شکست.

**[UQ9]** آیا عمق (Depth) وجود دارد؟
hairline border + elevation tiers (`--ds-shadow-*`) + لایه‌بندی. تخت بدون shadow/border = شکست.

**[UQ10]** آیا کُرئوگرافی حرکت (Motion Choreography) دارد؟
spring micro-interactions + stagger (گام ۴۰ms) + enter/exit. صفحهٔ کاملاً ایستا = شکست.
فقط opacity/transform/filter — نه width/height/top/left.

**[UQ11]** آیا میکرو‑اینترکشن‌ها پیاده شده‌اند؟
hover: `translateY(-1px)` + brighten border؛ press: spring tap (scale 0.97)؛ focus: visible ring.

**[UQ12]** آیا Restraint رعایت شده؟
بدون: neon / loud color / heavy glow / excessive glass / ۳ کارت یکسان گرد / cubic-bezier مکانیکی.

---

## بلاک D — سیستم طراحی و توکن‌ها

**[UQ13]** آیا رنگ‌های غالب سایت استفاده شده‌اند؟
فقط `--ds-*` / `--at-*` / `--nova-*` توکن‌ها. هیچ hex hardcode نشده.

**[UQ14]** آیا از کامپوننت‌های موجود استفاده شده؟
Component Decision Protocol: reuse → extend → compose → create. COMPONENTS.md چک شد.

**[UQ15]** آیا تایپوگرافی سلسله‌مراتب ادیتوریال دارد؟
مقیاس/وزن/leading مشخص؛ tabular-nums برای اعداد مالی؛ هیچ دو heading هم‌سایز پشت هم.

**[UQ16]** آیا Comfortable Density رعایت شده (حس زوم ۱۰۰٪)?
فضای منفی از ریتم بخش‌ها (space-8…space-10)؛ عناصر compact؛ max-width راحت.
ساخت این حس با `clamp()` روی توکن‌ها — نه با `zoom` روی `html`.

---

## بلاک E — وابستگی‌ها و یکپارچگی

**[UQ17]** آیا Server Component / Server Action نوشته شده؟
data fetching روی server؛ Server Actions برای mutations؛ هیچ secret در client bundle.

**[UQ18]** آیا زیر‌کامپوننت‌ها (sub-components) آپدیت/بازطراحی شده‌اند؟
اگر parent redesign شد، تمام visible children بررسی شده‌اند. لیست children باید visible باشد.

**[UQ19]** آیا صفحات/کامپوننت‌های مرتبط آپدیت شده‌اند؟
navigation/sidebar/breadcrumb؛ صفحات parent/child؛ هر جایی که feature نمایش داده می‌شود.

**[UQ20]** آیا وابستگی‌ها آپدیت شده‌اند؟
type تغییر کرد → همه consumers grep؛ cache tag تغییر کرد → revalidation همه‌جا.

---

## بلاک F — ارزیابی نهایی

**[UQ21]** آیا ایرادهای طراحی که با این چک‌لیست نمی‌خوانند وجود دارد؟
مرور کامل صفحه (نه فقط بخش جدید). هر ایراد که الان fix نمی‌شود → در post-task ثبت شود.

**[UQ22]** آیا این صفحه بازطراحی می‌خواهد یا باید از نو نوشته شود؟
- بیشتر از ۴۰٪ کد باید تغییر کند = از نو بنویس
- طراحی با §Craft Bar تضاد اساسی دارد = بازطراحی اجباری
- verdict: `[reuse / redesign / rewrite]` + دلیل

---

## §Craft Bar — بیلیون‌دلاری سقف است، نه کف

هر خروجی بصری باید همهٔ موارد زیر را رد کند:

- **عمق:** hairline border + elevation tiers (`--ds-shadow-*`)؛ تخت بی‌بافت نباشد.
- **Motion:** spring micro-interactions + stagger (گام ۴۰ms) + enter/exit + scroll-reveal. فقط opacity/transform/filter.
- **تایپوگرافی ادیتوریال:** مقیاس/وزن/leading مشخص، یک focal point.
- **میکرو‑اینترکشن:** spring tap، hover translateY(-1px), kinetic SVG.
- **Restraint:** بدون ۲۰۲۶‑slop — neon/glow/excessive glass/cubic-bezier مکانیکی.
- **Signature moment:** حداقل یک جزء به‌یادماندنی.
- **جزئیات پرمیوم:** touch target ≥44px، focus ring، tabular-nums، کنتراست ≥4.5:1 (اعداد ≥7:1).
- **هویت از دامنه:** فرم از semantics مالی، نه کپی رقیب.

اگر خروجی را Wise یا Linear منتشر نمی‌کردند → شکست است.
