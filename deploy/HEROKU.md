# 🚀 Deploy روی Heroku

## پیش‌نیازها

- حساب Heroku: [dashboard.heroku.com](https://dashboard.heroku.com)
- حساب GitHub با این repo
- Heroku CLI نصب شده: `brew install heroku/brew/heroku` یا [heroku.com/cli](https://devcenter.heroku.com/articles/heroku-cli)

---

## ساختار فایل‌های Heroku

| فایل | کاربرد |
|------|---------|
| `heroku.yml` | تنظیم build از Docker |
| `Dockerfile.heroku` | Image بهینه برای Heroku (از Docker Hub مستقیم) |
| `app.json` | تعریف اپ، addons، و env variables |
| `.github/workflows/deploy-heroku.yml` | CD خودکار با GitHub Actions |

---

## مرحله ۱ — ساخت اپ Heroku

```bash
# لاگین
heroku login

# ساخت اپ (اسم دلخواه)
heroku create your-app-name

# Stack را روی container بگذار
heroku stack:set container -a your-app-name

# اضافه کردن PostgreSQL رایگان
heroku addons:create heroku-postgresql:essential-0 -a your-app-name
```

> **توجه:** پس از addons:create، Heroku خودکار `DATABASE_URL` را در env اپ ست می‌کند.

---

## مرحله ۲ — ست کردن Environment Variables

### روش ۱ — از طریق Dashboard

رفتن به: `https://dashboard.heroku.com/apps/your-app-name/settings` → **Config Vars**

### روش ۲ — از طریق CLI (سریع‌تر)

```bash
APP=your-app-name

# متغیرهای اجباری
heroku config:set \
  NODE_ENV=production \
  NEXTAUTH_URL=https://$APP.herokuapp.com \
  NEXT_PUBLIC_APP_URL=https://$APP.herokuapp.com \
  NEXT_PUBLIC_SITE_URL=https://$APP.herokuapp.com \
  APP_URL=https://$APP.herokuapp.com \
  -a $APP

# Auth Secret (حتماً تغییر بده)
heroku config:set AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") -a $APP

# Cron Secret
heroku config:set CRON_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") -a $APP

# DIRECT_URL = همان DATABASE_URL که Heroku ست کرده (بدون ?pgbouncer=true)
heroku config:get DATABASE_URL -a $APP
heroku config:set DIRECT_URL=<مقدار DATABASE_URL بالا> -a $APP

# تنظیمات Prisma Connection Pool
heroku config:set \
  PRISMA_CONNECTION_LIMIT=5 \
  PRISMA_POOL_TIMEOUT=30 \
  -a $APP

# سایر تنظیمات
heroku config:set \
  TZ=Asia/Tehran \
  DEBUG_MODE=false \
  SETUP_PREVIEW_MODE=false \
  TGJU_SCRAPER_ENABLED=true \
  USDT_PREMIUM_PERCENT=1.5 \
  -a $APP
```

### متغیرهای اختیاری

```bash
# ایمیل (Resend)
heroku config:set \
  EMAIL_PROVIDER=resend \
  RESEND_API_KEY=your-resend-key \
  RESEND_FROM=noreply@your-domain.com \
  -a $APP

# ذخیره‌سازی فایل (S3-compatible — پیشنهاد: Cloudflare R2)
heroku config:set \
  S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com \
  S3_ACCESS_KEY=your-key \
  S3_SECRET_KEY=your-secret \
  S3_BUCKET_NAME=your-bucket \
  S3_REGION=auto \
  S3_PUBLIC_URL=https://<custom-domain-or-pub-<hash>.r2.dev> \
  -a $APP

# تلگرام
heroku config:set \
  TELEGRAM_BOT_TOKEN=your-token \
  TELEGRAM_BOT_USERNAME=your-bot \
  TELEGRAM_WEBHOOK_SECRET=random-secret \
  TELEGRAM_ADMIN_CHAT_ID=your-chat-id \
  -a $APP

# Google OAuth
heroku config:set \
  AUTH_GOOGLE_ID=your-client-id \
  AUTH_GOOGLE_SECRET=your-client-secret \
  -a $APP

# GitHub OAuth
heroku config:set \
  AUTH_GITHUB_ID=your-github-id \
  AUTH_GITHUB_SECRET=your-github-secret \
  -a $APP

# Upstash Redis (rate limiting)
heroku config:set \
  UPSTASH_REDIS_REST_URL=https://xxx.upstash.io \
  UPSTASH_REDIS_REST_TOKEN=your-token \
  -a $APP

# Sentry (error tracking)
heroku config:set \
  NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx \
  SENTRY_ORG=your-org \
  SENTRY_PROJECT=your-project \
  SENTRY_AUTH_TOKEN=your-token \
  -a $APP
```

---

## مرحله ۳ — اتصال GitHub به Heroku (CD خودکار)

### روش A: GitHub Actions (توصیه‌شده ✅)

این روش از GitHub Actions استفاده می‌کند — فایل `.github/workflows/deploy-heroku.yml` آماده است.

**۳ Secret باید در GitHub تنظیم شوند:**

رفتن به: `https://github.com/your-username/your-repo/settings/secrets/actions`

| نام Secret | مقدار |
|-----------|-------|
| `HEROKU_API_KEY` | از `heroku authorizations:create -d "GitHub Actions"` بگیر |
| `HEROKU_APP_NAME` | نام اپ Heroku (مثلاً `my-financial-app`) |
| `DATABASE_URL` | مقدار DATABASE_URL از Heroku Config Vars |

**گرفتن API Key:**
```bash
heroku authorizations:create -d "GitHub Actions"
# Token: را کپی کن
```

### روش B: Heroku GitHub Integration (ساده‌تر ولی محدودتر)

1. در Dashboard اپ → **Deploy** → **Deployment method** → **GitHub**
2. Repo را پیدا و Connect کن
3. **Automatic deploys** → **Enable Automatic Deploys**

> ⚠️ **مشکل روش B:** Heroku GitHub Integration از Docker container stack پشتیبانی محدود دارد و ممکن است build فعال نشود. **روش A (GitHub Actions) توصیه می‌شود.**

---

## مرحله ۴ — اولین دیپلوی دستی

```bash
# از طریق CLI
heroku container:push web -a your-app-name
heroku container:release web -a your-app-name

# یا push به GitHub → GitHub Actions خودکار دیپلوی می‌کند
git push origin main
```

---

## مرحله ۵ — بررسی وضعیت

```bash
# لاگ real-time
heroku logs --tail -a your-app-name

# وضعیت dynos
heroku ps -a your-app-name

# باز کردن اپ در مرورگر
heroku open -a your-app-name
```

---

## Cron Jobs روی Heroku

Heroku امکان cron job داخلی ندارد. سه گزینه:

### گزینه ۱ — Heroku Scheduler (رایگان)

```bash
heroku addons:create scheduler:standard -a your-app-name
heroku addons:open scheduler -a your-app-name
```

در dashboard Scheduler این jobs را اضافه کن:

| Job | Schedule |
|-----|----------|
| `curl -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/publish-scheduled-posts` | Every 10 minutes |
| `curl -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/refresh-market-rates` | Every 10 minutes |
| `curl -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/sync-bazaar` | Every hour |
| `curl -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/backup` | Daily (03:00) |

> ⚠️ Heroku Scheduler حداقل interval 10 دقیقه دارد (نه 1 دقیقه). اگر 1 دقیقه لازم داری → گزینه ۳.

### گزینه ۲ — Cron-job.org (رایگان، 1 دقیقه)

1. ثبت‌نام رایگان در [cron-job.org](https://cron-job.org)
2. سه job بساز با URL های بالا و interval 1 دقیقه
3. Header `Authorization: Bearer YOUR_CRON_SECRET` اضافه کن

### گزینه ۳ — GitHub Actions Scheduled (رایگان)

فایل `.github/workflows/cron-heroku.yml` برای این کار آماده است (ر.ک بخش بعدی).

---

## نکات مهم Heroku

### PORT
Heroku خودش PORT تعیین می‌کند — `Dockerfile.heroku` از `${PORT:-3000}` استفاده می‌کند ✅

### Ephemeral Filesystem
Heroku storage موقتی است — فایل‌های آپلودشده پس از restart پاک می‌شوند!

**راه‌حل:** از ذخیره‌سازی ابری S3-compatible استفاده کن (پیشنهاد: Cloudflare R2 — رایگان + کریپتو):
```
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET_NAME=...
S3_REGION=auto
S3_PUBLIC_URL=https://<دامنه اختصاصی یا pub-<hash>.r2.dev>
```

> ⚠️ بدون این متغیرها، آپلودها فقط روی دیسک لوکال Heroku می‌نویسند و بعد از هر restart/deploy پاک می‌شوند. بعد از ست کردن، وضعیت «آینه ابری» در داشبورد → تنظیمات → backup سبز می‌شود و سرویس «ذخیره‌سازی ابری» در LiveOps سالم می‌ماند.

**Backup دیتابیس (اختیاری ولی توصیه‌شده):**
```
S3_BACKUP_BUCKET=backup-private-bucket
```
باکت تصاویر باید public-read باشد تا URL تصاویر کار کند؛ اگر backup با همان باکت آپلود شود، فایل‌های JSON (شامل ایمیل/موبایل کاربران) عمومی می‌شود. یک bucket خصوصی جدا برای backup بساز و این متغیر را روی آن بگذار.

### انتخاب ذخیره‌سازی رایگان / قابل مهاجرت

کد با **S3 API استاندارد** کار می‌کند → مهاجرت به هر provider سازگار با S3 فقط تغییر متغیرهای env است، بدون تغییر کد.

#### ⭐ پیشنهاد: Cloudflare R2 (رایگان + قابل پرداخت با کریپتو)

بهترین گزینه برای شروع بدون کارت بانکی بین‌المللی:

| ویژگی | مقدار |
|--------|-------|
| ذخیره‌سازی رایگان | **۱۰GB دائمی** (نه دوره آزمایشی) |
| خروجی (egress) | **صفر** — تصاویر هر چقدر خوانده شوند هزینه ندارد |
| پرداخت | **USDC روی شبکه Base/Polygon** (از طریق Stripe checkout) — برای بالای سقف رایگان |
| قیمت بعد از سقف | $0.015 / GB-month |
| Sanctions | برای افغانستان در دسترس است (تحریم نیست)؛ کاربران ایران محدودیت کارت دارند ولی با USDC قابل دور زدن |

**ست کردن روی Heroku:**
```bash
heroku config:set \
  S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com \
  S3_ACCESS_KEY=<r2-access-key> \
  S3_SECRET_KEY=<r2-secret-key> \
  S3_BUCKET_NAME=<bucket-name> \
  S3_REGION=auto \
  S3_PUBLIC_URL=https://<custom-domain-or-r2.dev-url> \
  -a $APP
```

> ⚠️ **نکات R2:**
> - در داشبورد Cloudflare → R2 → bucket → **Settings → API** توکن بساز (Object Read & Write)
> - R2 به‌صورت پیش‌فرض خصوصی است؛ برای سرو مستقیم تصاویر یا دامنهٔ اختصاصی وصل کن (توصیه‌شده) یا `r2.dev` development URL را فعال کن — سپس آن را در `S3_PUBLIC_URL` بگذار
> - دامنهٔ سرو تصاویر را به `next.config.ts` → `images.remotePatterns` هم اضافه کن
> - چون باکت تصاویر عمومی می‌شود، **backup دیتابیس را در bucket خصوصی جدا** (`S3_BACKUP_BUCKET`) بریز

| گزینه | رایگان (2026) | پرداخت کریپتو | نکته |
|--------|---------------|---------------|------|
| **Cloudflare R2** ⭐ | 10GB دائمی + اگریس صفر | ✅ USDC (Base/Polygon) | بهترین انتخاب برای شروع بدون کارت |
| **Backblaze B2** | 10GB رایگان | ❌ (کارت فقط) | افغانستان OK ولی کارت لازم دارد؛ `S3_REGION` را روی region واقعی بگذار |
| **Storj** | فقط trial ۳۰ روزه | ⚠️ فقط توکن STORJ | سقف مینیمم $50/ماه برای کارت؛ با STORJ معاف |
| **MinIO** | کاملاً رایگان (self-host) | — | نیاز به سرور خودت دارد |

برای مهاجرت به هرکدام:
1. در provider جدید bucket بساز + کلید بساز
2. متغیرهای `S3_*` را به‌روزرسانی کن (`S3_REGION` را هم چک کن)
3. `S3_PUBLIC_URL` را روی دامنهٔ عمومی/URL جدید بگذار
4. (اختیاری) فایل‌های قبلی را با یک script به bucket جدید کپی کن
5. restart — بدون تغییر کد

### Free Dyno Sleep
در plan رایگان، dyno بعد از 30 دقیقه بی‌فعالیت می‌خوابد.
برای تازه نگه داشتن، از [kaffeine.herokuapp.com](https://kaffeine.herokuapp.com) یا cron ping استفاده کن.

---

## عیب‌یابی

```bash
# لاگ build
heroku builds:info -a your-app-name

# لاگ runtime
heroku logs --tail -a your-app-name

# باز کردن shell در dyno
heroku run sh -a your-app-name

# بررسی migration
heroku run "node node_modules/prisma/build/index.js migrate status" -a your-app-name

# ری‌استارت
heroku restart -a your-app-name
```

---

## مشکلات رایج

| خطا | علت | راه‌حل |
|-----|-----|--------|
| `prisma migrate deploy failed` | DATABASE_URL اشتباه | `heroku config:get DATABASE_URL` و چک کردن connection |
| `Application error` | لاگ بگیر | `heroku logs --tail` |
| `R10 Boot timeout` | build کند است | افزایش timeout یا بهینه‌سازی |
| `H10 App crashed` | env variable مفقود | همه Required env ها را بررسی کن |
| Image upload پاک می‌شود | Ephemeral filesystem | S3-compatible storage را configure کن (پیشنهاد: Cloudflare R2) |
