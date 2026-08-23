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

## ۲) بازلاین پروداکشن — 2026-08-23 (سویپ تمیز بعد از راند CLS/CSS)

> ⚠️ **درس اندازه‌گیری:** اعداد قبلی این بخش (CLS های ۰.۴+) عمدتاً **artifact کش Cloudflare** بودند — HTML کهنهٔ لبه با asset های جدید ناسازگار می‌شد. اورجین-مستقیم همان صفحات: exchanges CLS=0.000، contact=۹۵.
> **پروتکل جدید:** `node scripts/lh-audit.mjs <url> --host=20.109.177.20` (گزینهٔ جدید؛ hostname را مستقیم به IP اورجین می‌بَرد و کش لبه را دور می‌زند).

### اعداد تأییدشدهٔ تمیز (اورجین-مستقیم یا لبهٔ تازه)

| صفحه | Perf | LCP | TBT | CLS | یادداشت |
|------|-----:|----:|----:|----:|---------|
| `/contact` | **95** ✅ | 2.0s | 0.2s | 0.009 | اولین صفحهٔ سبز |
| `/exchanges` | **69** | 3.5s | 0.81s | **0.000** | شیفت برد نرخ کاملاً حل شد (SSR initialData) |
| `/authors` | 87 | 2.1s | 0.3s | 0.04 | |
| `/terms` | 87 | 3.4s | 0.2s | 0.04 | |
| `/credit-rates` | 86 | 3.3s | 0.2s | 0.07 | |
| `/about` | 83 | 2.5s | 0.2s | 0.04 | |
| `/help-center` | 83 | 3.7s | 0.1s | 0.04 | |
| `/feedback` | 85 | 3.6s | 0.1s | 0.03 | |
| `/privacy-policy` | 83 | 3.7s | 0.2s | 0.05 | |
| `/blog` | 79 | 3.6s | 0.2s | 0.08 | |
| `/search` | 80 | 3.7s | 0.2s | 0 | |
| `/services` | 81 | 3.6s | 0.2s | 0 | |
| `/support` | 80 | 3.6s | 0.3s | 0.04 | |
| `/signup` | 81→؟ | 3.9s | 0.13 | فیکس auth push شد — نیاز re-measure |
| `/signin` | 70→؟ | 4.0s | 0.23 | همان فیکس (lazy steps → eager EmailStep) |
| `/apply-exchange` | 50→؟ | 4.7s | 0.66 | در واقع ری‌دایرکت به auth بود؛ همین فیکس |
| `/beneficiaries` | 65→؟ | 4.1s | 0.49 | همینطور |
| `/` home | 67 | 5.1s | 0.3 | 0 | SI هنوز بالا |
| `/money-transfer` | 57 | 4.7s | 0.8 | 0 | CLS حل شد؛ LCP/TBT مانده |
| `/market-analysis` | 58 | 6.2s | 0.4 | 0 | LCP بدترین دسته |
| `/transfer` | 45 | 4.7s | 1.7 | 0 | TBT island لازم |
| `/single/<post>` | 46 | 5.7s | 1.0 | 0.001 | |
| `/archive/category/<slug>` | 51 | 5.1s | 1.0 | 0.07 | |
| `/exchanges/<slug>` | 47 | 4.5s | 2.6 | 0 | TBT سنگین‌ترین |

بقیه (categories 74 · posts 77 · subscription 77 · tags 75 · track 76 · online-payment 76 · kyc 76 · wallet 74 · services/* 73-74 · faq 75) — الگوی مشترک: **CLS تقریباً همه‌جا حل شده؛ گلوگاه باقی‌مانده LCP (۳.۴–۶.۲s) و TBT جزیره‌ای.**

### فیزیک مسئله (برای برنامهٔ بعدی)
- LCP همه‌جا H1 متنی است: TTFB ~۱s (اورجین B2s) + renderDelay ~۰.۸–۱.۹s (CSS رندربلاک ۵۰۹KB خام/~۷۰KB gzip + فونت).
- ۴۸۴KB از CSS واقعاً utilities تولیدشده از سورس خود src است — برش امن سریع ندارد؛ مسیرهای ممکن: critical-CSS inlining، سبک‌سازی dark/responsive variants، یا پذیرش LCP ~۲.۵–۳s و جبران نمره با TBT≈0 و CLS≈0.
- TTFB: بیشترِ ترافیک واقعی از لبهٔ CF (cache ۵min) سرو می‌شود؛ LH همیشه cold می‌زند → نمرهٔ LH بدبینانه‌تر از تجربهٔ واقعی است.

### ۲.۱) وضعیت پوشش اندازه‌گیری
✅ **تکمیل شد 2026-08-23:** هر ۳۳ صفحه ایستای عمومی + ۳ نمونه داینامیک (`/single/<post>`، `/archive/category/<slug>`، `/exchanges/<slug>`) اندازه گرفته شد — جدول §۲. اعداد داینامیک‌ها نمایندهٔ قالب است؛ برای هر slug جدید همان الگو انتظار می‌رود.
⬜ **باقی‌مانده (Tier-2 لاگین‌دار):** `/customer/*` (~۲۰) · `/exchange/*` (~۲۵) · `/dashboard/*` (~۷۰) — سنجش با session واقعی یا بودجهٔ چانک از `perf/bundle-baseline.json`. بعد از سبزشدن tier 1.

---

## ۳) تشخیص‌ها (انجام‌شده — دوباره تکرار نکن)

### مشکل مشترک همه صفحات
1. **چانک vendor `3rwqtu5fxuzvl.js`** (74KB transfer / 233KB خام، شامل react-dom runtime) روی **هر ۶ صفحه** لود می‌شود. bootup آن:
   home=4561ms (خالص scripting=2395ms!) · exchange-rates=1873ms · exchanges=1730ms · money-transfer=1706ms · archive=1343ms · about=1057ms
   → یعنی hydration سنگین است؛ حجم JS نیست، **کارِ اجرایی** است.
2. **CLS ≈ 0.073–0.075 در ۵ صفحه از ۶** (فقط exchange-rates سالم=0.005). یک علت مشترک دارد — احتمالاً font-swap / scrollbar / تصویر بدون ابعاد. هنوز root-cause نشده.
3. **CSS بلااستفاده:** `1o-qveruoccg0.css` در چند صفحه (۰.۱۵–۰.۴۴s صرفه) + آرشیو: `3kslbvmdmgs25.css` = 0.62s.

### یافته‌های راند ۲ (2026-08-23 عصر — بعد از سویپ کامل)
4. **LCP همهٔ صفحات H1 متنی است** (نه تصویر): فازها = TTFB ~۱s + renderDelay تا ~۱.۹s (منتظر CSS رندربلاک روی شبکهٔ شبیه‌سازی‌شده).
5. **CSS سراسری غول:** یک چانک Tailwind **۵۰۹–۵۱۹KB خام** روی همهٔ صفحات (`.dark`×۲۴۸۷، gradient×۳۲۰۳ — پالت کامل v4) + دو چانک ~۱۱۸KB از CSS Modules داشبورد که به‌خاطر merge پیش‌فرض (`cssChunking:true`) به همهٔ صفحات سایت می‌نشند. فیکس اعمال‌شده: `experimental.cssChunking:'graph'` + `@import "tailwindcss" source("../")` → بیلد لوکال: صفحات سایت ۷۹۵→**۶۵۹KB** و چانک‌های داشبورد جدا شدند.
6. **تیکر defer بدون رزرو ارتفاع** = منبع شیفت‌های بزرگ صفحه‌ای (contact 0.407 / apply-exchange 0.44). فیکس: ظرف `h-10 sm:h-11` همیشه رندر می‌شود؛ حالت خالی دیگر `null` برنمی‌گرداند.
7. **برد نرخ‌ها:** `ExchangeQuotesBoard` اول اسکلت کوتاه، بعد جدول بلند پس از fetch کلاینی (shift score 0.939 روی main در /exchanges). فیکس: دادهٔ اولیه SSR با همان safeCache actions به هر دو مصرف‌کننده (`/exchanges`, `/money-transfer`).

### مخصوص home (بدترین صفحه)
- main-thread کل: **13.9s** → «other»=5099ms · **styleLayout=3905ms (!)** · scriptEvaluation=3315ms
- styleLayout این‌قدر بزرگ یعنی reflow اجباری یا CSS گران حین hydration — نه فقط JS.
- وزن کل صفحه 1034KB؛ فونت‌ها ~92KB woff2 (قابل قبول)؛ چند عکس unsplash بدون بهینه‌سازی کامل.

### مخصوص سایر صفحات
- `/money-transfer` و `/exchange-rates`: چانک route-specific خودشان هم سنگین است (bootup تا 4.9s) → widgetهای calculator باید dynamic شوند.
- `/archive`: LCP=8.4s با TBT کم (390ms) → مشکل اصلی LCP resource/CSS است نه JS.

### واقعیت دیپلوی (به‌روز 2026-08-23 عصر)
- WIP قبلی **دیپلوی شد** (کانتینر web = کامیت `85c9060e`، شامل defer ها). جدول §۲ همین بیلد را اندازه گرفته است.
- نکتهٔ تفسیر چانک‌ها: نام `3rwqtu5fxuzvl.js` در بیلد جدید هم هست — hash محتوایی است و محتوای vendor تغییر نکرده؛ نشانهٔ بیلد قدیمی «نیست» (نشانهٔ درست: مارکرهای DOM مثل حذف `data-scroll-behavior`).

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

- [x] **قدم ۰ — WIP را ببند و دیپلوی کن** ✅ 2026-08-23: ۸ کامیت منطقی (docs/hydration-defer/nav-refactor/css-dead/chore/lint) + verify سبز (۹۴۴ تست) + push.
  - ⚠️ **مانع کشف‌شده در مسیر دیپلوی:** اولین push ها با failure ی Docker build برگشتند — علت: `package-lock.json` با `package.json` ناهمگام بود (`npm ci` در مرحله deps): «Missing: webpack@5.109.2 …». فیکس: `npm install` لوکال برای sync کردن lock (postinstall پرisma لوکال ممکن است روی DB شکست بخورد — بی‌اهمیت؛ lock قبلش نوشته می‌شود) → کامیت `fix(deps)` → بیلد سبز. **قانون جدید:** بعد از هر merge dependabot یا دست‌کاری دستی lock، قبل از push اجرا شود: `npm ci --dry-run --ignore-scripts`.
- [x] **قدم ۰.۵ — سویپ کامل** ✅ 2026-08-23: ۳۶ صفحه اندازه گرفته شد → جدول §۲. یافته اصلی: TBT حل شد؛ LCP و CLS(دسته‌ای) مانده.
- [ ] **CLS کلاس «برد-نرخ»** (`/exchanges` و صفحات دارای `ExchangeQuotesBoard`): اسکلتِ loading با جدول واقعی هم‌ارتفاع نیست → شیفت 0.939 روی main. فیکس درست: دادهٔ اولیه را SSR بده (server action/props به‌جای fetch کلاینی) یا ارتفاع اسکلت را دقیقاً برابر ردیف‌های QUOTES_INITIAL رزرو کن.
- [ ] **CLS صفحات فرم/احراز** (contact=0.407، apply-exchange=0.44، signin=0.197، signup=0.128): برای هرکدام یک `npx lighthouse <url> --output=json` بگیر و `layout-shifts` را باز کن؛ منابع محتمل: font-swap متن فارسی، فرم‌های کلاینتی که بعداً mount می‌شوند.
- [ ] **LCP همه‌جا (2.1–6.7s):** سه اهرم به ترتیب سود: (۱) preload فونت اصلی + `font-display` و fallback-metrics درست، (۲) ابعاد/priority تصاویر hero بالای فولد، (۳) حذف CSS رندربلاک بلااستفاده (آرشیو قبلاً 0.62s صرفه نشان می‌داد). TTFB ریشه ~730ms با CF cache-rule فعلی قابل قبول است — دست نزن مگر بعد از این دو.
- [ ] **TBT باقی‌مانده** روی `/authors`(1.4s)، `/market-analysis`(1.3s)، `/financial-news`، `/posts`, `/categories` (~1.1-1.3s): island های تعاملی همین صفحات را dynamic کن.
- [ ] **حلقه پایانی:** re-sweep کامل با `lh-audit` تا همه ≥95؛ گزارش JSON ها را replace و جدول §۲ را آپدیت کن.

---

## ۶) پروتکل ادامه کار (برای هر AI — دقیقاً همین ترتیب)

1. همین فایل را کامل بخوان (۲ دقیقه) + `git log --oneline -8` و `git status` بزن ببین قدم ۰ انجام شده یا نه.
2. گیت قوانین: `npm run rules:check` (اجباری AGENTS.md).
3. اولین چک‌باکسِ نخوردهٔ §۵ را بردار — **فقط همان یک آیتم**: fix → `npx tsc --noEmit` → measure.
4. اندازه‌گیری: لوکال=`npm run build && npm run start` سپس `node scripts/lh-audit.mjs http://localhost:3000 --pages=<همان صفحه>` ؛ قطعی=push به main → صبر دیپلوی Azure → `lh-audit` روی پروداکشن.
5. **همین فایل را آپدیت کن** (تیک چک‌باکس + یافته جدید + جدول §۲ اگر عدد گرفتی) و فقط فایل‌های خودت را کامیت کن.
6. اگر کشف کردی یک تشخیص §۳ غلط بوده → اصلاحش کن، خط نزن، تاریخ بزن.

### موانع شناخته‌شدهٔ این ماشین (وقت را تلف نکن)
- **«CI سبز است ولی سایت آپدیت نشده»** (رخ داد 2026-08-23): اسکریپت قدیمی `azure-update.sh` در تلاشِ دقیقهٔ بعدِ push، چون git دیگر جلو نمی‌رفت گارد را رد می‌کرد و با ایمیج قدیمی sentinel می‌نوشت → cron هرگز تلاش مجدد نمی‌کرد. فیکس شد: حالا وجود تگ immutable `sha-<short>` در ghcr شرط دیپلوی است. **تشخیص سریع:** روی VM `docker ps` بزن و Created کانتینر web را با زمان بیلد CI مقایسه کن؛ اگر قدیمی بود: `cd ~/fm-blog && git pull && bash deploy/azure-update.sh`.
- Prisma shadow-DB روی verify بلاک است → مسیر: `prisma migrate diff → push → resolve`.
- capture داخل `tmp/` typecheck را می‌شکند — خروجی موقت را آنجا نریز.
- Playwright driver گاهی lock می‌شود («Browser is already in use») → قبل از باز کردن مرورگر با curl چک کن سایت بالا است.
- کش Cloudflare (Edge TTL 5min + stale-while-revalidate=86400) و کش Next (`x-nextjs-prerender`) بعد از دیپلوی تا چند دقیقه HTML قدیمی می‌دهند — برای تست واقعی اورجین: `curl --resolve financialmarket.page:443:20.109.177.20 https://...`
- دیپلوی = فقط `git push origin main`؛ CI تصویر را می‌سازد (~۸-۱۲ دقیقه)، VM cron-pull می‌کند (`deploy/AZURE.md`).

---

## ۷) تاریخچه به‌روزرسانی این فایل

| تاریخ | تغییر |
|-------|-------|
| 2026-08-23 | ایجاد SSOT + بازلاین ۶ گزارش (۵ صفحه متمایز) + تشخیص اولیه (vendor chunk, styleLayout, CLS مشترک, WIP undeployed) |
| 2026-08-23 | دامنه به کل سایت گسترش یافت: لیست پیش‌فرض `lh-audit.mjs` = ۳۳ صفحه ایستای عمومی + پروتکل نمونه‌های داینامیک؛ Tier-2 لاگین‌دار تعریف شد |
| 2026-08-23 | قدم ۰ کامل شد: WIP در ۸ کامیت منطقی بسته و push شد؛ مانع `npm ci` (lock ناهمگام) کشف و فیکس شد — ر.ک §۵ |
| 2026-08-23 | **دیپلوی گیر کرده بود حل شد:** کانتینر وب ۷ ساعت روی ایمیج قدیمی ماند (sentinel زودهنگام). فیکس `azure-update.sh`: gate روی تگ immutable `sha-<short>` — ر.ک §۶ موانع |
| 2026-08-23 | **بازلاین کامل ۳۶ صفحه** بعد از دیپلوی defer ها: TBT حل، LCP کند مانده، CLS انفجاری روی دسته برد-نرخ/فرم — اولویت‌های جدید در §۵ |
| 2026-08-23 | راند CLS push شد (SSR board + ticker slot)؛ راند CSS push شد (`cssChunking:'graph'` + `@source src`) — گیت دیپلوی تا v4 تکامل یافت: gate نهایی = pull موفق تگ `sha-<short>` با دیمون + assert کانتینر==ID تگ :main. **درس:** `docker compose images` ایمیج کانتینر را می‌دهد نه آخرین تگ؛ `manifest inspect` auth کلاینت می‌خواهد و روی VM کار نمی‌کند |
