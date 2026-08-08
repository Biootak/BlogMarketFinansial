# 🚀 Deploy روی Heroku — روش یکپارچه (Container Stack)

> **این سند مرجع واحد دیپلوی Heroku است.** همه (توسعه‌دهنده، CI، دیپلوی دستی)
> باید از **یک روش** پیروی کنند — روشی که تست شده و مشکلاتش رفع شده است.
> اگر فایل دیگری چیزی خلاف این سند گفت، **این سند حرف آخر است.**

---

## 📌 خلاصهٔ روش (مهم)

| مورد | مقدار |
|------|--------|
| **Stack** | `container` (داکر) — **نه** buildpack |
| **Dyno** | `eco` (رایگان با GitHub Student Pack؛ ۵۱۲MB RAM — بعد از ۳۰ دقیقه بی‌فعالیتی می‌خوابد) |
| **Database** | `heroku-postgresql:essential-0` |
| **Build** | روی GitHub Actions (۷GB RAM — build هرگز OOM نمی‌شود) |
| **Deploy** | push به `main` → workflow خودکار build + push + release |
| **Migrations** | فقط در build-time با DATABASE_URL واقعی production |
| **فرمت تصاویر** | فقط `webp` (AVIF در `next.config.ts` حذف شد — حافظه) |

**⛔ هرگز از buildpack استفاده نکن** (`git push heroku main` روی stack عادی) —
build روی Heroku با ۵۱۲MB انجام می‌شود و `next build` این پروژه OOM می‌دهد.

---

## معماری دیپلوی (چطور کار می‌کند)

```
git push origin main
        │
        ▼
.github/workflows/deploy-heroku.yml
  1. Checkout
  2. خواندن DATABASE_URL واقعی از Heroku (منبع حقیقت — نه secret جدا)
  3. docker build -f Dockerfile.heroku --build-arg DATABASE_URL=... (روی runner با ۷GB RAM)
        │  ← داخل build: prisma migrate deploy + seed + next build (OUTPUT_STANDALONE=1)
  4. docker push registry.heroku.com/<app>/web
  5. heroku container:release web -a <app>   ← release تصویر push شده
```

نکته‌های کلیدی که از خطاها یاد گرفتیم (نگاه نکن — رفع شده):

- `docker/build-push-action` (BuildKit) تصویر را با OCI index push می‌کند که
  Heroku قبول نمی‌کند (`failed to push ...: unsupported`) → از **docker push ساده** استفاده می‌شود.
- API قدیمی `/container/release` (مفرد) ۴۰۴ می‌داد → از **`heroku container:release`** (CLI) استفاده می‌شود.
- کپی `prisma` CLI به runtime باعث کرش `MODULE_NOT_FOUND` می‌شد (@prisma/engines و effect) →
  **runtime migrate حذف شد**؛ migrations فقط در build-time.
- روی stack عادی، `git push heroku main` → OOM در build → استک باید `container` باشد.

---

## پیش‌نیازها

- حساب Heroku + [GitHub Student Pack](https://education.github.com/pack) (اعتبار $13/ماه برای ۲۴ ماه)
- Heroku CLI: `npm install -g heroku` (یا [heroku.com/cli](https://devcenter.heroku.com/articles/heroku-cli))

---

## مرحله ۱ — ساخت اپ (فقط اولین بار)

```bash
heroku login
heroku create your-app-name
heroku stack:set container -a your-app-name          # ⚠️ حتماً container
heroku addons:create heroku-postgresql:essential-0 -a your-app-name
heroku ps:scale web=1:eco -a your-app-name            # ⚠️ Eco — داخل اعتبار دانشجویی
```

> بعد از `addons:create`، Heroku خودش `DATABASE_URL` را ست می‌کند.

---

## مرحله ۲ — Config Vars (Heroku)

```bash
APP=your-app-name

# ─── اجباری ───────────────────────────────────────────────────────────────
heroku config:set \
  NODE_ENV=production \
  NEXTAUTH_URL=https://$APP.herokuapp.com \
  NEXT_PUBLIC_APP_URL=https://$APP.herokuapp.com \
  NEXT_PUBLIC_SITE_URL=https://$APP.herokuapp.com \
  APP_URL=https://$APP.herokuapp.com \
  -a $APP

# کلید رمزنگاری (NextAuth v5 به AUTH_SECRET/NEXTAUTH_SECRET گوش می‌دهد)
heroku config:set AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") -a $APP
heroku config:set NEXTAUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") -a $APP

# ⚠️ CRON_SECRET — باید با GitHub secret یکی باشد (ببین مرحله ۳)
heroku config:set CRON_SECRET=<همان مقدار GitHub> -a $APP

# ─── حافظه (Eco dyno = 512MB) — بدون این‌ها R14/R15 و کرش می‌گیری ──────────
heroku config:set \
  NODE_OPTIONS=--max-old-space-size=256 \
  PRISMA_CONNECTION_LIMIT=3 \
  -a $APP

# ─── بقیه ────────────────────────────────────────────────────────────────
heroku config:set \
  TZ=Asia/Tehran \
  DEBUG_MODE=false \
  SETUP_PREVIEW_MODE=false \
  TGJU_SCRAPER_ENABLED=true \
  USDT_PREMIUM_PERCENT=1.5 \
  -a $APP
```

**اختیاری (S3/R2 برای آپلودها — وگرنه بعد از هر restart آپلودها پاک می‌شوند):**
مطابق توضیحات بخش «ذخیره‌سازی» پایین.

---

## مرحله ۳ — GitHub Secrets (برای CI و cron)

رفتن به: `https://github.com/<user>/<repo>/settings/secrets/actions`

| Secret | مقدار |
|--------|--------|
| `HEROKU_API_KEY` | `heroku authorizations:create -d "GitHub Actions"` |
| `HEROKU_APP_NAME` | نام اپ (مثلاً `financial-market`) |
| `SEED_OWNER_PASSWORD` | رمز OWNER برای seed اولیه (اختیاری) |
| `CRON_SECRET` | **دقیقاً همان مقدار Heroku config** |
| `APP_URL` | آدرس سایت (مثلاً `https://www.financialmarket.page`) |

> ⚠️ **قانون CRON_SECRET:** باید در **هر دو طرف** یکی باشد.
> اگر فقط در GitHub باشد → اپ ۵۰۳ می‌دهد؛ اگر فقط در Heroku باشد → cron ها ۴۰۱ می‌گیرند.
> ست کردن: `gh secret set CRON_SECRET --body "<مقدار>"` (بعد از ست کردن در Heroku).

---

## مرحله ۴ — Deploy

### روش اصلی: push به main (توصیه‌شده ✅)

```bash
git push origin main
```

workflow خودکار: build (داکر، روی runner) → push به registry → `heroku container:release`.

### روش دستی (فقط اورژانس — همان روش داخلی CI):

```bash
APP=your-app-name
DATABASE_URL=$(heroku config:get DATABASE_URL -a $APP)

docker build -f Dockerfile.heroku \
  --build-arg DATABASE_URL="$DATABASE_URL" \
  -t registry.heroku.com/$APP/web .
docker push registry.heroku.com/$APP/web
heroku container:release web -a $APP
```

> ⛔ مستندات (`*.md` و `deploy/**`) دیپلوی trigger نمی‌کنند (در workflow تنظیم شده).

---

## مرحله ۵ — Cron Jobs و بیدار نگه داشتن Eco — **cron-job.org** (همه‌چیز)

> 2026-08-08: `.github/workflows/cron.yml` **حذف شد** — همهٔ cron ها به
> [cron-job.org](https://cron-job.org) منتقل شدند (رایگان، دقیق؛ زمان‌بندی
> GitHub Actions تا ۳۰+ دقیقه تأخیر داشت و Eco در این فاصله می‌خوابید).

### Jobs بساز (در داشبورد cron-job.org)

برای هر ردیف یک job بساز. همه به‌جز `/api/ping` به این Header نیاز دارند:

**Header مشترک:** `Authorization: Bearer <CRON_SECRET>`

| Job | URL | بازه |
|-----|-----|------|
| Keep-alive dyno (بدون auth) | `https://your-app.herokuapp.com/api/ping` | هر ۵ دقیقه |
| انتشار پست‌های زمان‌بندی‌شده | `https://your-app.herokuapp.com/api/cron/publish-scheduled-posts` | هر ۱ دقیقه |
| به‌روزرسانی نرخ بازار | `https://your-app.herokuapp.com/api/cron/refresh-market-rates` | هر ۱ دقیقه |
| Sync بازار (TGJU) | `https://your-app.herokuapp.com/api/cron/sync-bazaar` | هر ۱۰ دقیقه |
| Backup دیتابیس | `https://your-app.herokuapp.com/api/cron/backup` | شبانه ۰۳:۰۰ UTC |

- `/api/ping` فقط برای بیدار نگه داشتن است (۵ دقیقه < آستانهٔ خواب ۳۰ دقیقه → هیچ‌وقت نمی‌خوابد).
- بقیه بدون `CRON_SECRET` درست → ۵۰۳ می‌دهند (باید در Heroku config ست باشد).
- دامنه اختصاصی (مثلاً `https://financialmarket.page`) به‌جای herokuapp.com هم کار می‌کند.

---

## ذخیره‌سازی (آپلودها — اجباری برای production واقعی)

Heroku filesystem **اپمرال** است — بدون S3، آپلودها بعد از هر restart/deploy پاک می‌شوند.
پیشنهاد: **Cloudflare R2** (۱۰GB رایگان دائمی + اگریس صفر + پرداخت با USDC):

```bash
heroku config:set \
  S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com \
  S3_ACCESS_KEY=<key> \
  S3_SECRET_KEY=<secret> \
  S3_BUCKET_NAME=<bucket> \
  S3_REGION=auto \
  S3_PUBLIC_URL=https://<دامنه یا pub-<hash>.r2.dev> \
  -a $APP
```

باکت backup باید **خصوصی و جدا** باشد: `S3_BACKUP_BUCKET=<private-bucket>`.

---

## بررسی وضعیت و عیب‌یابی

```bash
heroku ps -a $APP                      # dyno type باید Eco باشد
heroku releases -a $APP                # آخرین release
heroku logs --tail -a $APP             # لاگ real-time
heroku logs --num 300 -a $APP | grep -E 'R14|R15'   # خطاهای حافظه
heroku addons -a $APP                  # postgres essential-0
gh run list --workflow 'Deploy to Heroku' --limit 5   # آخرین دیپلوی‌ها
```

### چک پایداری خودکار

`.github/workflows/stability-check.yml` هر ۶ ساعت (و با `workflow_dispatch` دستی)
وضعیت dyno، آخرین release، HTTP سایت، R14/R15/H10 و روند حافظه را گزارش می‌دهد؛
اگر ناسالم باشد run قرمز می‌شود. خروجی در: GitHub → Actions → Heroku Stability Check.

### حافظه (R14/R15)

- R14 = رد شدن از ۵۱۲MB (swap) — کندی. R15 = کرش اجباری dyno.
- کنترل: `NODE_OPTIONS=--max-old-space-size=256` + **فقط webp** در `next.config.ts`.
- متریک واقعی: `heroku labs:enable log-runtime-metrics -a $APP` → `heroku logs --tail` →
  خط‌های `sample#memory_rss=... sample#memory_quota=512.00MB`.

### خطاهای رایج (که قبلاً افتاده و رفع شده)

| خطا | علت | راه‌حل (از قبل در کد اعمال شده) |
|-----|-----|----------------------------------|
| `failed to push ...: unsupported` | buildx OCI index | workflow از `docker push` ساده استفاده می‌کند |
| `/container/release` 404 | endpoint اشتباه | workflow از `heroku container:release` استفاده می‌کند |
| `Cannot find module '@prisma/engines'` / `'effect'` | کپی ناقص prisma CLI در runtime | runtime migrate حذف شد؛ migrations در build-time |
| `R14/R15` بعد از هر deploy | آپتیمایز AVIF با sharp + کش خالی | فقط `webp` در `next.config.ts` + سقف هیپ ۲۵۶MB |
| buildpack OOM در `next build` | build روی Heroku با ۵۱۲MB | از buildpack استفاده نکن — استک container است |
| cron ها ۵۰۳ | `CRON_SECRET` در Heroku نبود | در هر دو سمت ست کن (مرحله ۲ و ۳) |

---

## قوانین طلایی (برای همیشه)

1. **روش واحد = push به `main`** — همه از همین استفاده کنند.
2. **استک `container`** — اگر کسی دید اپ روی stack عادی است: `heroku stack:set container` + redeploy.
3. **`CRON_SECRET` در دو سمت** — بعد از تغییر، در Heroku و GitHub هم‌زمان عوض کن.
4. **فرمت تصویر `webp`** را در `next.config.ts` به `avif` برنگردان (بازگشت کرش‌های حافظه).
5. **مستندات را فقط به‌روز کن، روش را نه** — اگر روش بهتری یافتی، اول این سند را به‌روز کن بعد اجرا.
