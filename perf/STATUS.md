# 🚀 Performance Status — منبع واحد حقیقت (SSOT)

> **هر هوش مصنوعی/توسعه‌دهنده:** قبل از هر کار سرعت، فقط همین فایل را بخوان — کجاییم، چه شده، بعدش چی.
> آخرین به‌روزرسانی: **2026-08-23** (بازلاین گرفته‌شده از پروداکشن)
> ⛔ هرگز تشخیص را از صفر شروع نکن. کار قبلی اینجاست. آخر سشن: تیک چک‌باکس + آپدیت جدول + کامیت.

---

## ۱) مأموریت و معیار

| مورد | مقدار |
|------|-------|
| **هدف** | نمره Performance **همهٔ صفحات عمومی سایت** ≥ 95 — کل سایت، نه نمونه |
| **دامنه** | ~۳۳ مسیر ایستا عمومی (`(site)` + fintech + auth) + قالب‌های داینامیک با slug واقعی (single/archive-category/exchange-profile/...) |
| **صفحات لاگین‌دار** | `/customer/*`, `/exchange/*`, `/dashboard/*` — بدون session قابل اندازه‌گیری نیستند؛ tier جدا (§۲.۲) — بعد از صفحات عمومی |
| **محیط سنجش** | `https://financialmarket.page` (پروداکشن) — نه لوکال |
| **شرایط تست** | Lighthouse 13.x — mobile — simulated throttling (پیش‌فرض `lh-audit.mjs`) |
| **ابزار رسمی** | `node scripts/lh-audit.mjs https://financialmarket.page` — لیست پیش‌فرض = کل صفحات ایستای عمومی؛ exit code غیرصفر اگر هر صفحه‌ای زیر ۹۵ باشد |
| **قالب‌های داینامیک** | یک نمونه واقعی از DB بگیر و اضافه کن: `--pages=/single/<slug>,/archive/category/<slug>,/exchanges/<slug>` |
| **گزارش‌های کامل JSON** | `perf/lighthouse-<page>.json` — گزارش جدید جایگزین قدیمی می‌شود |

---

## ۲) بازلاین پروداکشن — 2026-08-23 (~06:50 UTC)

| صفحه | Perf | FCP | LCP | TBT | SI | CLS | وضعیت |
|------|-----:|----:|----:|----:|---:|----:|-------|
| `/` (home) | **32** | 2.9s | 8.4s | **2720ms** | 8.7s | 0.075 | 🔴 بحرانی |
| `/archive` | **54** | 2.6s | 8.4s | 390ms | 7.9s | 0.073 | 🔴 |
| `/money-transfer` | **62** | 2.7s | 7.8s | 180ms | 6.4s | 0.074 | 🟠 |
| `/exchange-rates` | **65** | 2.1s | 4.8s | 510ms | 4.8s | 0.005 | 🟠 |
| `/about` | **74** | 2.4s | 4.3s | 200ms | 5.8s | 0.075 | 🟡 |
| `/exchanges` | **85** | 2.0s | 3.6s | 90ms | 3.9s | 0.075 | 🟡 |

نکته: accessibility/best-practices/seo همه ≥91 هستند — فقط performance مشکل دارد.

⚠️ **تصحیح پوشش (2026-08-23):** گزارش `lighthouse-exchange-rates.json` در واقع `/money-transfer` را تست کرده (`finalUrl` در JSON) → بازلاین بالا فقط **۵ صفحه متمایز از ~۳۳+ صفحه عمومی** است. جدول §۲.۱ فهرست کامل و وضعیت اندازه‌گیری هرکدام است.

### ۲.۱) فهرست کامل صفحات ایستای عمومی — وضعیت اندازه‌گیری

| اندازه‌گیری‌شده | هنوز اندازه گرفته نشده (⬜ = با قدم ۰ یا اولین lh-audit کامل پر می‌شود) |
|---|---|
| `/` 🔴32 · `/archive` 🔴54 · `/money-transfer` 🟠62 · `/about` 🟡74 · `/exchanges` 🟡85 | `/apply-exchange` · `/authors` · `/beneficiaries` · `/blog` · `/categories` · `/contact` · `/credit-rates` · `/faq` · `/feedback` · `/financial-news` · `/help-center` · `/kyc` · `/market-analysis` · `/online-payment` · `/posts` · `/privacy-policy` · `/search` · `/services` · `/services/compare` · `/services/order` · `/signin` · `/signup` · `/subscription` · `/support` · `/tags` · `/terms` · `/track` · `/transfer` · `/wallet` |

قالب‌های داینامیک (با نمونهٔ واقعی): `/single/<slug>` · `/archive/category/<slug>` · `/archive/tag/<slug>` · `/author/<id>` · `/exchanges/<slug>` (+`about`/`hours`/`markets`) · `/credit-rates/<bank>` · `/track/<code>` · `/subscription/<plan>` · `/about/<slug>` · زیر‌صفحات محتوایی money-transfer/online-payment/market-analysis/financial-news

### ۲.۲) Tier 2 — صفحات لاگین‌دار (بعد از سبزشدن tier 1)
`/customer/*` (~۲۰ مسیر) · `/exchange/*` (~۲۵ مسیر) · `/dashboard/*` (~۷۰ مسیر) — سنجش با session واقعی (LH روی پروداکشن با کوکی) یا حداقل بیلد-چک وزن چانک هر route از `perf/bundle-baseline.json`. معیار عملی: بودجهٔ چانک + Lighthouse دستی دوره‌ای.

---

## ۳) تشخیص‌ها (انجام‌شده — دوباره تکرار نکن)

### مشکل مشترک همه صفحات
1. **چانک vendor `3rwqtu5fxuzvl.js`** (74KB transfer / 233KB خام، شامل react-dom runtime) روی **هر ۶ صفحه** لود می‌شود. bootup آن:
   home=4561ms (خالص scripting=2395ms!) · exchange-rates=1873ms · exchanges=1730ms · money-transfer=1706ms · archive=1343ms · about=1057ms
   → یعنی hydration سنگین است؛ حجم JS نیست، **کارِ اجرایی** است.
2. **CLS ≈ 0.073–0.075 در ۵ صفحه از ۶** (فقط exchange-rates سالم=0.005). یک علت مشترک دارد — احتمالاً font-swap / scrollbar / تصویر بدون ابعاد. هنوز root-cause نشده.
3. **CSS بلااستفاده:** `1o-qveruoccg0.css` در چند صفحه (۰.۱۵–۰.۴۴s صرفه) + آرشیو: `3kslbvmdmgs25.css` = 0.62s.

### مخصوص home (بدترین صفحه)
- main-thread کل: **13.9s** → «other»=5099ms · **styleLayout=3905ms (!)** · scriptEvaluation=3315ms
- styleLayout این‌قدر بزرگ یعنی reflow اجباری یا CSS گران حین hydration — نه فقط JS.
- وزن کل صفحه 1034KB؛ فونت‌ها ~92KB woff2 (قابل قبول)؛ چند عکس unsplash بدون بهینه‌سازی کامل.

### مخصوص سایر صفحات
- `/money-transfer` و `/exchange-rates`: چانک route-specific خودشان هم سنگین است (bootup تا 4.9s) → widgetهای calculator باید dynamic شوند.
- `/archive`: LCP=8.4s با TBT کم (390ms) → مشکل اصلی LCP resource/CSS است نه JS.

### واقعیت دیپلوی (خیلی مهم)
- **بیلد پروداکشن قدیمی‌تر از working tree است** — WIP زیر هنوز دیپلوی نشده:
  `DeferredToaster` · `DeferredMarketRatesTicker` · `DeferredPageViewTracker` (جدید)، حذف `ViewLink`/`useViewTransition`، تغییرات `layout.tsx`/`globals.css`/`archive-hub.css`/dashboard css ها، تغییرات `package.json`.
- پس بخشی از شکاف فعلی ممکن است با دیپلوی همین WIP بسته شود → **اول دیپلوی، بعد اندازه‌گیری مجدد، بعد کار جدید.**

---

## ۴) انجام‌شده (کامیت‌های perf اخیر)

```
b62a4126 perf(css): kill Tailwind safelist, convert theme gradients to inline styles
23fb6900 perf(bundle): lazy-load Sentry Replay, CSS-motion Footer, dead CSS removal
86918732 perf(images): honest sizes for article hero/gallery LCP variants
3ca359c6 perf(newsletter): native RHF rules instead of zod+zodResolver (-64KB public JS)
95840d8f perf(bundle): deep-import public error/state boundaries
01051502 perf(singles): coalesce article scroll into rAF; shared 1s clock for quote countdowns
12dd72f5 fix(ui): drop SearchModal scroll-lock reflow and padding double-compensation
de32253c fix(ui): reserve scrollbar gutter — page-transition layout shake
```

---

## ۵) بعدی‌ها — به همین ترتیب اجرا کن (یک آیتم در هر بار)

- [ ] **قدم ۰ — WIP را ببند و دیپلوی کن:** بررسی staged changes (لیست بالا) → `npx tsc --noEmit` + `npm run verify` → کامیت‌های منطقی جدا → `git push origin main` → صبر pull خودکار Azure → اندازه‌گیری مجدد پروداکشن (`lh-audit`) → جدول بازلاین بالا را آپدیت کن. *(تا وقتی این انجام نشود، هر بهینه‌سازی جدید کورکورانه است.)*
- [ ] **قدم ۰.۵ — سویپ کامل:** `node scripts/lh-audit.mjs https://financialmarket.page` (لیست پیش‌فرض = همهٔ ۳۳ صفحه ایستا) + یک نمونه از هر قالب داینامیک با slug واقعی → جدول §۲.۱ را پر کن؛ صفحات قرمز را به لیست کار اضافه کن.
- [ ] **CLS مشترک 0.075:** با trace Lighthouse (layout-shift items در گزارش JSON، فیلد `audits.layout-shifts`) عناصر شیفت‌یابنده را در هر صفحه پیدا کن؛ علت مشترک را یک‌جا رفع کن.
- [ ] **home TBT=2720ms:** لیست client component هایی که روی home hydrate می‌شوند (Header، ticker، فرم newsletter، toaster، analytics…)؛ هرچه below-fold یا non-critical است → deferred/dynamic. هدف TBT<200ms.
- [ ] **home styleLayout=3905ms:** dom-size را چک کن؛ انیمیشن‌های layout-triggering و selector های گران در CSS حذف/ساده شوند (قانون §Motion: فقط opacity+transform).
- [ ] **route chunks سنگین:** money-transfer/exchange-rates → widgetهای محاسبه‌گر با `next/dynamic` (بدون SSR برای interactive-only).
- [ ] **CSS بلااستفاده:** بررسی چرا چند فایل CSS بزرگ per-page شپ می‌شود (archive=0.62s صرفه) — احتمالاً import های global زنجیره‌ای؛ به co-located module.css منتقل کن.
- [ ] **حلقه پایانی:** `node scripts/lh-audit.mjs https://financialmarket.page --threshold=95` سبز شود → گزارش‌های JSON را replace کن → جدول §۲ را آپدیت کن → کامیت.

---

## ۶) پروتکل ادامه کار (برای هر AI — دقیقاً همین ترتیب)

1. همین فایل را کامل بخوان (۲ دقیقه) + `git log --oneline -8` و `git status` بزن ببین قدم ۰ انجام شده یا نه.
2. گیت قوانین: `npm run rules:check` (اجباری AGENTS.md).
3. اولین چک‌باکسِ نخوردهٔ §۵ را بردار — **فقط همان یک آیتم**: fix → `npx tsc --noEmit` → measure.
4. اندازه‌گیری: لوکال=`npm run build && npm run start` سپس `node scripts/lh-audit.mjs http://localhost:3000 --pages=<همان صفحه>` ؛ قطعی=push به main → صبر دیپلوی Azure → `lh-audit` روی پروداکشن.
5. **همین فایل را آپدیت کن** (تیک چک‌باکس + یافته جدید + جدول §۲ اگر عدد گرفتی) و فقط فایل‌های خودت را کامیت کن.
6. اگر کشف کردی یک تشخیص §۳ غلط بوده → اصلاحش کن، خط نزن، تاریخ بزن.

### موانع شناخته‌شدهٔ این ماشین (وقت را تلف نکن)
- Prisma shadow-DB روی verify بلاک است → مسیر: `prisma migrate diff → push → resolve`.
- capture داخل `tmp/` typecheck را می‌شکند — خروجی موقت را آنجا نریز.
- Playwright driver گاهی lock می‌شود («Browser is already in use») → قبل از باز کردن مرورگر با curl چک کن سایت بالا است.
- دیپلوی = فقط `git push origin main`؛ cron هر دقیقه روی Azure VM pull+build می‌کند (`deploy/AZURE.md`).

---

## ۷) تاریخچه به‌روزرسانی این فایل

| تاریخ | تغییر |
|-------|-------|
| 2026-08-23 | ایجاد SSOT + بازلاین ۶ صفحه پروداکشن + تشخیص اولیه (vendor chunk, styleLayout, CLS مشترک, WIP undeployed) |
