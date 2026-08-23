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

## ۲) بازلاین پروداکشن — 2026-08-23 (بعد از دیپلوی defer-hydration؛ سویپ کامل ۳۶ صفحه)

| صفحه | Perf | LCP | TBT | CLS | | صفحه | Perf | LCP | TBT | CLS |
|------|-----:|----:|----:|----:|---|------|-----:|----:|----:|----:|
| `/` home | **46** | 5.6s | 1.1s | 0.008 | | `/money-transfer` | **46** | 5.2s | 1.5s | 0.010 |
| `/about` | **64** | 4.6s | 0.4s | 0.008 | | `/market-analysis` | **41** | 6.5s | 1.3s | 0.072 |
| `/apply-exchange` | **37** | 4.8s | 0.8s | **0.44** ⚠️ | | `/online-payment` | **57** | 3.9s | 1.0s | 0.008 |
| `/authors` | **53** | 4.1s | 1.4s | 0.041 | | `/posts` | **45** | 6.1s | 1.1s | 0.072 |
| `/beneficiaries` | **47** | 5.6s | 1.1s | 0.115 | | `/privacy-policy` | **62** | 4.1s | 0.8s | 0.041 |
| `/blog` | **70** | 3.9s | 0.5s | 0.083 | | `/search` | **79** | 3.0s | 0.1s | 0.078 |
| `/categories` | **39** | 6.7s | 1.3s | 0.072 | | `/services` | **91** | 2.8s | 0.0s | 0.082 |
| `/contact` | **46** | 4.0s | 0.6s | **0.407** ⚠️ | | `/services/compare` | **85** | 3.3s | 0.1s | 0.074 |
| `/credit-rates` | **59** | 4.1s | 0.8s | 0.074 | | `/services/order` | **81** | 3.4s | 0.3s | 0.074 |
| `/exchanges` | **57** | 3.8s | 0.3s | **0.418** ⚠️ | | `/signin` | **74** | 3.8s | 0.1s | **0.197** ⚠️ |
| `/faq` | **83** | 3.7s | 0.1s | 0.062 | | `/signup` | **82** | 3.7s | 0.1s | 0.128 |
| `/feedback` | **70** | 3.9s | 0.5s | 0.035 | | `/subscription` | **80** | 3.7s | 0.1s | 0.082 |
| `/financial-news` | **41** | 6.4s | 1.1s | 0.072 | | `/support` | **94** 🟢-نزدیک | 2.5s | 0.1s | 0.042 |
| `/help-center` | **60** | 4.2s | 0.8s | 0.041 | | `/tags` | **72** | 5.0s | 0.1s | 0.072 |
| `/kyc` | **59** | 4.1s | 0.9s | 0.074 | | `/terms` | **82** | 3.8s | 0.1s | 0.082 |
| `/track` | **86** | 2.1s | 0.0s | 0.074 | | `/transfer` | **63** | 4.9s | 0.3s | 0.009 |
| `/wallet` | **78** | 3.8s | 0.1s | 0.099 | | `/single/<post>` | **69** | 5.4s | 0.1s | 0.074 |
| `/archive/category/<slug>` | **72** | 4.6s | 0.2s | 0.080 | | `/exchanges/abantether` | **59** | 4.2s | 0.8s | 0.082 |

**جمع‌بندی سویپ:** هیچ صفحه‌ای ≥95 نیست (بهترین: support=94، services=91).
- ✅ **TBT عملاً حل شد** (اثر defer hydration): اکثر صفحات 0.0–0.5s — قبلاً home=2720ms بود.
- ❌ **LCP همه‌جا کند است** (2.1–6.7s): TTFB ریشه‌ای ~730ms + render-blocking CSS/fونت + تصاویر.
- 🔴 **CLS روی دسته‌ای از صفحات منفجر شده** (⚠️ در جدول): مکانیزم تأییدشده برای کلاس «برد نرخ» (`/exchanges` و مشابه): `ExchangeQuotesBoard` اول اسکلتِ کوتاه رندر می‌کند و بعد از fetch کلاینی جدول بلند می‌آید → کل main هل داده می‌شود (shift score 0.939 روی main). صفحات فرم/احراز (contact/apply-exchange/signin) منبع شیفت جداگانه دارند — هنوز root-cause نشده.
- مقایسه با قبل از دیپلوی: home 32→46، money-transfer 62→46 (نوسان LCP)، exchanges 85→57 (CLS جدید!). یعنی defer ها TBT را کشتند ولی CLS جدیدی روی بعضی صفحات ساختند یا قبلاً پنهان بود.

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
