# ✅ چک‌لیست تحویل به مشتری — BlogMarketFinansial

> تاریخ: ۲۰۲۶-۰۸-۱۵ · وضعیت: **در حال آماده‌سازی** (دیپلوی در جریان)
> این سند پاسخ «پروژه آماده تحویل است یا نه؟» را با **وضعیت واقعی** می‌دهد — نه قول.
> هر آیتم یا ✅ (پاس) است یا ⚠️ (نیاز به اقدام) — placeholder ممنوع.

---

## ۱. وضعیت کلی

| بخش | وضعیت | جزئیات |
|------|--------|--------|
| گیت کیفیت (`npm run verify`) | ✅ سبز | typecheck ✓ + lint (biome) ✓ + ۹۳۶ تست ✓ (۴۷ فایل) |
| بیلد production (لوکال) | ✅ موفق | Next.js 16.3.1 — تمام routeها کامپایل شدند، بدون خطا |
| دیپلوی production | ⏳ در جریان | workflow GitHub Actions «Deploy to Heroku» در حال اجرا (run #31899274003) |
| دیتابیس production | ✅ متصل | AWS RDS (eu-west-1) — اتصال تست شد |
| مالک تستی | ✅ حذف شد | `dev-owner@test.local` حذف شد → صفحه `/setup` از نو بالا می‌آید (بکاپ: `.local-backups/`) |
| کارهای ناتمام در کد | ✅ تمیز | صفر فایل تغییرنیافته‌ی کامیت‌نشده؛ فقط ۲ TODO در src (جدا از تست‌ها) |

---

## ۲. تغییرات این جلسه (کامیت‌شده)

| کامیت | موضوع |
|-------|--------|
| `bb696c90` | فیکس KYC/تلگرام: reuse توکن لینک معتبر (به‌جای باطل‌کردن هر poll)، پارس شماره با libphonenumber بدون فیلتر VOIP، نشانگر «در حال تأیید خودکار» قبل از refresh، poll با backoff |
| `72c21bb4` | رفع خطاهای lint (مرتب‌سازی import) + ignore کردن بکاپ‌های محلی DB |

هر دو کامیت push شدند (`39841dca..72c21bb4` روی `origin/main`) و دیپلوی خودکار دقیقاً همین نسخه را build می‌کند.

---

## ۳. گیت‌های کیفیت (وضعیت واقعی امروز)

- [x] `npx tsc --noEmit` → بدون خطا
- [x] `npx biome check .` → بدون خطا (۲ فایل با فرمت خراب از قبل — فیکس و کامیت شد)
- [x] `npx vitest run` → **۹۳۶ تست پاس** (شامل تست‌های KYC، امنیت انتقال، concurrency)
- [x] `npm run build` → موفق (لوکال، Turbopack)
- [x] rules-gate (AGENTS.md) → مهر تازه

---

## ۴. دیتابیس و داده‌ها

### انجام‌شده
- [x] **مالک تستی حذف شد**: `dev-owner@test.local` (ساخته‌شده ۲۰۲۶-۰۸-۱۴) — شمار OWNER الان **۰** است
  - بکاپ کامل ردیف کاربر + پروفایل + audit log: `.local-backups/dev-owner-backup-2026-08-15.json`
  - پس از دیپلوی، `/setup` اولین‌بار را نشان می‌دهد (wizard ساخت مالک واقعی)

### تصمیمات لازم قبل از تحویل (از مشتری/مالک بپرس)
- [ ] **داده‌های نمونه (seed)**: DB الان محتوای نمونه دارد (پست‌ها، کاربران، صرافی‌ها — واقعی‌نما ولی ساختگی).
      تحویل تمیز = `SEED_WIPE=true node prisma/seed.js` (مالک حفظ می‌شود؛ ولی مالک الان وجود ندارد، پس همه‌چیز پاک می‌شود).
      ⚠️ قبل از اجرا با مالک هماهنگ شود — محتوای واقعی‌ای که ممکن است کاربران ساخته باشند حذف می‌شود.
- [ ] **migrations**: `prisma migrate deploy` در build-time خودکار اجرا می‌شود (Dockerfile.heroku) — نیازی به اقدام دستی نیست.

---

## ۵. پیکربندی محیط (Heroku)

- [x] `heroku config` چک شد — متغیرهای کلیدی موجودند: `DATABASE_URL`، `DIRECT_URL` (خالی؟)، `AUTH_SECRET`، `APP_URL=https://financialmarket.page`، `NEXTAUTH_URL`، `RESEND_API_KEY`، `TELEGRAM_*`، `S3_*`، `BACKUP_S3_*`، `CRON_SECRET`
- [ ] ⚠️ `DIRECT_URL` روی Heroku **ست نشده** (خروجی `heroku config` آن را نشان نداد) — در build از DATABASE_URL پر می‌شود؛ برای runtime مطمئن شو مشکلی نیست
- [ ] `.env.example` شامل ۳۴ متغیر مستند — با Heroku config مقایسه و diff بگیر (مقادیر پنهان)
- [ ] Eco dyno: `NODE_OPTIONS=--max-old-space-size=256` تنظیم است (مستند در Dockerfile.heroku) ✓

---

## ۶. امنیت

### بلاک‌کننده برای تحویل
- [ ] ⚠️ **۸ آسیب‌پذیری dependabot** (۴ high + ۴ moderate) روی default branch — قبل از تحویل رفع شود
      https://github.com/Biootak/BlogMarketFinansial/security/dependabot

### انجام‌شده / قابل تأیید
- [x] وب‌هوک تلگرام fail-closed (secret header)
- [x] مالک فقط از `/setup` ساخته می‌شود — seed هرگز OWNER نمی‌سازد
- [x] OTP تلگرام رایگان + auto-verify فقط با شمارهٔ تأییدشدهٔ تلگرام
- [x] 2FA + backup code + passwordVersion/tokenVersion (باطل‌سازی session)

---

## ۷. دیپلوی — روش یکپارچه (منبع: `deploy/HEROKU.md`)

```
git push origin main
  → .github/workflows/deploy-heroku.yml
      1. login به Heroku Container Registry
      2. خواندن DATABASE_URL/AUTH_SECRET واقعی از Heroku (منبع حقیقت)
      3. docker build -f Dockerfile.heroku --build-arg ... (روی runner 7GB)
         ← داخل build: prisma migrate deploy + seed idempotent + next build
      4. docker push registry.heroku.com/financial-market/web
      5. heroku container:release web -a financial-market
```

- [x] push به `origin/main` انجام شد → run در جریان
- [ ] پس از اتمام run: `gh run view 31899274003` → conclusion باید success باشد
- [ ] **⛔ `git push heroku main` ممنوع** (دلایلش خطای امروز بود: build بدون ARG → DATABASE_URL خالی → P1012)

---

## ۸. تست‌های پس از دیپلوی (Smoke Test — روز تحویل)

| # | تست | انتظار |
|---|------|--------|
| ۱ | باز کردن `https://financialmarket.page/` | صفحهٔ اصلی فارسی با نرخ‌ها/تیکر بدون خطا |
| ۲ | `https://financialmarket.page/setup` | wizard اولین‌بار (چون OWNER حذف شد) — ساخت حساب مالک را کامل کن |
| ۳ | ورود با حساب مالک → داشبورد | بدون خطا؛ همهٔ سکشن‌ها باز شوند |
| ۴ | ثبت‌نام کاربر عادی + ورود | ایمیل/گذرواژه کار کند |
| ۵ | KYC سطح ۱ با تلگرام | auto-verify بدون OTP + fallback OTP تلگرام |
| ۶ | یک پست را باز کن + نظردهی | رندر، تصاویر CDN، دکمه‌ها |
| ۷ | `/robots.txt` + `/sitemap.xml` | ۲۰۰ با محتوای صحیح |
| ۸ | تبدیل ارز (calculator) | AFN اول، محاسبه درست |
| ۹ | مسیر ۴۰۴ (`/no-such-page`) | صفحهٔ not-found فارسی تمیز |
| ۱۰ | کنسول مرورگر | بدون error red در صفحه‌های اصلی |

---

## ۹. قبل از تحویل نهایی به مشتری

- [ ] تصمیم داده‌های نمونه (بخش ۴) با مالک نهایی شود
- [ ] رفع/برنامه‌ریزی آسیب‌پذیری‌های dependabot (بخش ۶)
- [ ] اجرای کامل Smoke Test (بخش ۸) و ثبت نتیجه
- [ ] تنظیم مالک واقعی از `/setup` + تحویل credentials امن (نه در چت/کامیت)
- [ ] برچسب نسخه: `git tag v1.0.0 && git push origin v1.0.0` (اختیاری — توصیه می‌شود)
- [ ] مستندات به‌روز: `deploy/HEROKU.md` (منبع دیپلوی)، `.env.example` (مرجع کانفیگ)

---

## ۱۰. ریسک‌های شناخته‌شده (صادقانه)

- ⚠️ Dyno Eco ۵۱۲MB — بعد از ۳۰ دقیقه بی‌فعالیتی می‌خوابد (اولین درخواست بعدی کند است)؛ برای تحویل حرفه‌ای dyno بزرگ‌تر پیشنهاد شود
- ⚠️ دیتابیس RDS هم‌اکنون بین توسعه و production مشترک است (DATABASE_URL یکسان) — برای ایزوله‌سازی، DB جدا برای مشتری پیشنهاد شود
- ⚠️ `heroku config` در ترمینال مقادیر را نمایش می‌دهد — فقط افراد مجاز CLI داشته باشند
- ⚠️ بکاپ DB روزانه (workflow `backup-nightly.yml`) دارد — قبل از هر عملیات دستی DB از آن استفاده شود

---

**جمع‌بندی:** پروژه از نظر کد **آماده است** (verify + build سبز، صفر باگ شناخته‌شدهٔ باز در scope ما).
**تحویل نهایی منوط به**: اتمام موفق دیپلوی، رفع/زمان‌بندی آسیب‌پذیری‌ها، تصمیم داده‌های نمونه، و اجرای Smoke Test.
