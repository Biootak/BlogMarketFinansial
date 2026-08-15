# 🚀 Deploy روی Heroku — روش یکپارچه (Container Stack)

> **این سند مرجع واحد دیپلوی Heroku است.** همه (توسعه‌دهنده، CI، دیپلوی دستی)
> باید از **یک روش** پیروی کنند — روشی که تست شده و مشکلاتش رفع شده است.
> اگر فایل دیگری چیزی خلاف این سند گفت، **این سند حرف آخر است.**

---

## 📌 خلاصهٔ روش (مهم)

| مورد | مقدار |
|------|--------|
| **🌐 آدرس production** | `https://financialmarket.page/` |
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

## 🚫 ممنوعیت Vercel (دستور مالک — ۲۰۲۶-۰۸-۰۹)

**Vercel دیگر هیچ‌جا استفاده نمی‌شود و ممنوع است.** کل زیرساخت (سایت، API، ربات
تلگرام، cron) فقط روی Heroku است. هیچ هوش مصنوعی / دستیار / توسعه‌دهنده‌ای نباید
به Vercel نزدیک شود مگر اینکه خود مالک صریحاً اجازه دهد.

- ❌ هیچ deploy به Vercel نکنید (`vercel --prod` ممنوع).
- ❌ وبهوک ربات تلگرام را به `*.vercel.app` وصل نکنید — باید فقط به `*.herokuapp.com` باشد.
- ❌ پیشنهاد انتقال به Vercel ندهید؛ حتی به‌عنوان گزینهٔ جایگزین.
- کلاینت Vercel لوکال logout شده و `.vercel` حذف شده است — به آن نیاز نیست.
- اگر هر جا لینک/رجوع به Vercel دیدید (env، کد، مستندات)، آن را با معادل Heroku جایگزین کنید.

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
  AUTH_URL=https://$APP.herokuapp.com \
  NEXT_PUBLIC_APP_URL=https://$APP.herokuapp.com \
  NEXT_PUBLIC_SITE_URL=https://$APP.herokuapp.com \
  APP_URL=https://$APP.herokuapp.com \
  -a $APP

# ⚠️ اگر از دامنه اختصاصی استفاده می‌کنی (مثل financialmarket.page)، این دو را هم ست کن:
# heroku config:set NEXTAUTH_URL=https://financialmarket.page AUTH_URL=https://financialmarket.page -a $APP

# کلید رمزنگاری (NextAuth v5 به AUTH_SECRET/NEXTAUTH_SECRET گوش می‌دهد)
heroku config:set AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") -a $APP
heroku config:set NEXTAUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") -a $APP

# ─── ورود با گوگل/گیت‌هاب (اختیاری ولی برای ادمین/نویسنده‌ها لازم است) ─────
# بدون این‌ها دکمه‌های «ادامه با گوگل/گیت‌هاب» خطا می‌دهند. مقادیر را از
# OAuth app ها کپی کن (جزئیات ساخت + callback URL ها در پایین همین بخش):
heroku config:set \
  AUTH_GOOGLE_ID=<Client ID> \
  AUTH_GOOGLE_SECRET=<Client Secret> \
  AUTH_GITHUB_ID=<Client ID> \
  AUTH_GITHUB_SECRET=<Client Secret> \
  -a $APP

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

# ⚠️ ایمیل دریافت بازخورد/تماس — اگر نزاری، پیام‌های کاربران به
# noreply@example.com می‌روند و گم می‌شوند.
heroku config:set CONTACT_TO_EMAIL=your-actual-email@example.com -a $APP

# ─── Upstash Redis (rate-limiter + maintenance gate) ────────────────────────
# از Heroku Dashboard → Resources → Find more add-ons → Upstash Redis
# یا مستقیماً: https://elements.heroku.com/addons/upstash-redis
heroku addons:create upstash-redis:micro -a $APP
# (بعد از addon، متغیرهای UPSTASH_REDIS_REST_URL و _TOKEN خودکار ست می‌شوند)
```

**اختیاری (S3/R2 برای آپلودها — وگرنه بعد از هر restart آپلودها پاک می‌شوند):**
مطابق توضیحات بخش «ذخیره‌سازی» پایین.

### ساخت OAuth app ها (گوگل + گیت‌هاب)

- **Google:** [Google Cloud Console](https://console.cloud.google.com) →
  APIs & Services → Credentials → **Create OAuth client ID** (نوع Web).
  در «Authorized redirect URIs» این را ثبت کن:
  `https://$APP.herokuapp.com/api/auth/callback/google`
  (برای dev هم `http://localhost:7180/api/auth/callback/google`).
  اول صفحهٔ Consent Screen را تنظیم کن (حالت Testing بدون تأیید گوگل کار می‌کند؛
  فقط اکانت‌های test اضافه‌شده وارد می‌شوند).

- **GitHub:** GitHub → Settings → Developer settings → **OAuth Apps** →
  New OAuth App. در «Authorization callback URL»:
  `https://$APP.herokuapp.com/api/auth/callback/github`
  (برای dev هم `http://localhost:7180/api/auth/callback/github`).

> نکته: هر callback URL (dev + prod) باید در OAuth app ثبت شده باشد، وگرنه
> گوگل/گیت‌هاب با «redirect_uri_mismatch» ورود را رد می‌کنند — همین خطا معمولاً
> علت «گیت‌هاب و گوگل کار نمی‌کنه» است.

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

## چک‌لیست قبل از دیپلوی (۲۰۲۶-۰۸-۱۵ — هر بار قبل از push)

> این چک‌لیست از تغییرات perf 2026-08-15 (loader تصویر CDN + گیت پرفورمنس) الهام
> گرفته — همهٔ موارد واقعاً در دیپلوی قبلی دیده و رفع شده‌اند.

```bash
# ۱) verify (rules + typecheck + lint + تست‌ها)
npm run verify

# ۲) build پروداکشن در ایزوله + گیت پرفورمنس (رگرسیون bundle و first-load)
rm -rf .next-perf && NEXT_DIST_DIR=.next-perf npm run build && \
  NEXT_DIST_DIR=.next-perf npm run perf:snapshot && \
  NEXT_DIST_DIR=.next-perf npm run perf:gate

# ۳) بررسی دستی — تصاویر articles باید مستقیم از CDN باشند (نه /_next/image):
#    صفحهٔ single → view-source → srcset تصاویر بدنه باید images.unsplash.com/...?w=... باشد
```

### ⚠️ Config Vars — دامنهٔ اختصاصی (financialmarket.page)

اگر دامنهٔ اختصاصی داری، این چهار متغیر باید به دامنهٔ اصلی اشاره کنند، نه `$APP.herokuapp.com`:

```bash
heroku config:set NEXTAUTH_URL=https://financialmarket.page AUTH_URL=https://financialmarket.page -a $APP
# NEXT_PUBLIC_* مقدار fallback کد (financialmarket.page) است و build-time inline می‌شود؛
# ولی برای خواندن سمت سرور، ترجیحاً همان دامنه را هم ست کن:
heroku config:set NEXT_PUBLIC_APP_URL=https://financialmarket.page NEXT_PUBLIC_SITE_URL=https://financialmarket.page -a $APP
```

### ⚠️ NEXT_PUBLIC_SENTRY_DSN — build-time

`NEXT_PUBLIC_SENTRY_DSN` در build-time inline می‌شود ولی workflow build-arg ندارد →
Sentry wrap در production غیرفعال است (مگر اینکه config var ست شود و build دوباره
اجرا شود). اگر monitoring لازم است، قبل از push یک build-arg در
`.github/workflows/deploy-heroku.yml` اضافه کن و DSN را در Heroku config ست کن.

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
| Keep-alive dyno (بدون auth) | `https://financialmarket.page/api/ping` | هر ۵ دقیقه |
| انتشار پست‌های زمان‌بندی‌شده | `.../api/cron/publish-scheduled-posts` | هر ۱ دقیقه |
| به‌روزرسانی نرخ بازار | `.../api/cron/refresh-market-rates` | هر ۱ دقیقه |
| صف اعلان تلگرام | `.../api/cron/telegram-notifications` | هر ۱ دقیقه |
| انقضای quote ها | `.../api/cron/expire-quotes` | هر ۵ دقیقه |
| Sync لیست‌های نرخ | `.../api/cron/sync-rate-lists` | هر ۵ دقیقه |
| Sync بازار (TGJU) | `.../api/cron/sync-bazaar` | هر ۱۰ دقیقه |
| انقضای KYC ها | `.../api/cron/expire-kyc` | روزانه ۰۱:۰۰ UTC |
| Backup دیتابیس | `.../api/cron/backup` | شبانه ۰۳:۰۰ UTC |

> ساخت مجدد همهٔ job ها با یک دستور (REST API رسمی — `scripts/setup-cron-jobs.mjs`):
> `CROJOB_API_KEY="..." node scripts/setup-cron-jobs.mjs` (CRON_SECRET از `.env.local` خوانده می‌شود).

- `/api/ping` فقط برای بیدار نگه داشتن است (۵ دقیقه < آستانهٔ خواب ۳۰ دقیقه → هیچ‌وقت نمی‌خوابد).
- بقیه بدون `CRON_SECRET` درست → ۵۰۳ می‌دهند (باید در Heroku config ست باشد).
- دامنه اختصاصی (مثلاً `https://financialmarket.page`) به‌جای herokuapp.com هم کار می‌کند.

> 2026-08-12: `.github/workflows/keep-alive.yml` به‌عنوان **لایهٔ مکمل** اضافه شد
> (هر ۲۰ دقیقه `/api/ping` + خانه). این جایگزین cron-job.org نیست — همان تأخیر
> زمان‌بندی گیت‌هاب که در بالا ذکر شد هنوز پابرجاست؛ cron-job.org منبع اصلی
> بیدار نگه‌داشتن است و این workflow فقط برای مواردی است که cron-job.org حذف/
> منقضی شده باشد.

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

### گزینهٔ بدون کارت اعتباری — Filebase + پروکسی داخلی (2026-08-10)

اگر کارت بین‌المللی در دسترس نیست (R2/B2 به payment method نیاز دارند)، از
**Filebase** استفاده کن — تیر رایگان ۵GB با ثبت‌نام صرفاً با ایمیل، بدون کارت:

```bash
# Filebase (فقط S3 Object Storage — نه IPFS)
S3_ENDPOINT=https://s3.filebase.io
S3_REGION=auto
S3_ACCESS_KEY=<key>
S3_SECRET_KEY=<secret>
S3_BUCKET_NAME=fm-blog-uploads
# ⚠️ تیر رایگان Filebase باکت عمومی نمی‌دهد («Public buckets require a paid
# subscription»). پس به‌جای URL عمومی، به پروکسی داخلی اپ اشاره کن:
S3_PUBLIC_URL=/uploads
```

با `S3_PUBLIC_URL=/uploads` تصاویر از مسیر داخلی `/uploads/*` سرو می‌شوند
(rewrite → `/api/uploads/*` → `getFileStream`: اول S3، بعد لوکال). این یعنی:
- عکس‌ها بعد از هر restart/deploy روی Heroku هم می‌مانند (در S3 هستند)
- نیازی به باکت عمومی نیست و هزینه صفر است
- سقف تیر رایگان: ۵GB فضا + **۱٬۰۰۰ فایل** — برای وبلاگ با عکس‌های webp
  چند صد پست کافی است؛ بعداً می‌توانی فایل‌های قدیمی را پاک کنی یا ارتقا دهی
- هر درخواست تصویر از dyno رد می‌شود؛ با `Cache-Control: immutable` در
  rewrite ها و کش مرورگر/CDN جبران می‌شود

**چیدمان دو-اکانتی (تصمیم مالک 2026-08-10):** هر دو اکانت Filebase برای
**مصرف (آپلودها)** هستند — اکانت فعال `fm-blog` و اکانت دوم `fm-blog-uploads`
به‌عنوان جایگزین (در صورت پر شدن، فقط `S3_BUCKET_NAME` را عوض کن). **بکاپ
فقط روی Backblaze B2** می‌رود:

```bash
# بکاپ (Backblaze B2 — همان اکانت financialmarket)
BACKUP_S3_PRIMARY_ENDPOINT=https://s3.us-east-005.backblazeb2.com
BACKUP_S3_PRIMARY_ACCESS_KEY=...
BACKUP_S3_PRIMARY_SECRET_KEY=...
BACKUP_S3_PRIMARY_BUCKET=financialmarket
BACKUP_S3_PRIMARY_REGION=us-east-005
```

> نکته: بکاپ JSON اپ (`src/lib/backup.ts`) به `S3_*` متصل است و در همان باکت
> مصرف (خصوصی) زیر پیشوند `backups/` ذخیره می‌شود — چون باکت Filebase خصوصی
> است امن می‌ماند؛ بکاپ کامل pg_dump روی B2 می‌رود.

### پول باکت‌های S3 (اختیاری — `S3_POOL`)

اگر چند اکانت/provider داری (مثلاً دو اکانت Filebase برای دور زدن سقف ۱ باکت
تیر رایگان)، به‌جای `S3_*` یک JSON array در `S3_POOL` بده — هر entry کلید
مستقل خودش را دارد:

```bash
heroku config:set S3_POOL='[{"endpoint":"https://s3.filebase.io","accessKey":"...","secretKey":"...","bucket":"fm-blog","region":"auto"},{"endpoint":"https://s3.filebase.io","accessKey":"...","secretKey":"...","bucket":"fm-blog-uploads","region":"auto"}]' -a $APP
```

- آپلود round-robin بین باکت‌ها؛ اگر یکی خطا داد باکت بعدی امتحان می‌شود.
- backup ها با پیشوند `backups/` در همان پول می‌روند — همهٔ باکت‌ها باید **خصوصی**
  باشند (با Filebase که باکت عمومی نمی‌دهد درست است؛ با R2/B2 با URL عمومی
  احتیاط کن).
- بدون `S3_POOL` رفتار قبلی (تک‌باکتی `S3_*` + `S3_BACKUP_BUCKET`) حفظ
  می‌شود — این گزینه صرفاً اختیاری است و دیپلوی فعلی بدون تغییر کار می‌کند.

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

### 🚀 Lighthouse Audit (تست سرعت موبایل — همهٔ صفحات)

`.github/workflows/lighthouse-audit.yml` — اجرای موبایل Lighthouse روی همهٔ صفحات عمومی
روی **رانر تمیز گیت‌هاب** (اعداد قابل‌اعتماد؛ مستقل از CPU ماشین توسعه‌دهنده و سهمیهٔ PSI).
فقط دستی — هیچ‌وقت روی push اجرا نمی‌شود و دیپلوی را trigger نمی‌کند:

```bash
gh workflow run 'Lighthouse Audit'                                   # ۶ صفحه
gh workflow run 'Lighthouse Audit' -f url=https://.../exchanges      # یک صفحه
gh workflow run 'Lighthouse Audit' -f detail=true                    # + LCP element/MT/منابع
gh run watch <run-id>   # جدول PERF/A11Y/BP/SEO + FCP/LCP/TBT/CLS/TTFB در لاگ
```

### 🧊 معماری نرخ بازار — «هرگز روی scrape بلاک نشو» (2026-08-08)

مسیر hero (home/money-transfer) از `getMarketRates()` می‌خواند که assemble موازی از
منابع خارجی می‌سازد (TGJU/bonbast/sarafi/fx/USDT). سه اصل که **نباید** برگردند:

1. **`REQUEST_TIMEOUT_MS` کران سخت**: tgju=4s، bonbast=4s، sarafi=4s، fx=3s.
   (قبلاً تا ۱۵ ثانیه — hero همهٔ صفحات منتظر کندترین منبع می‌ماند.)
2. **`getMarketRates` با `swr: true`** (safe-cache): بعد از انقضای کش، مقدار قبلی
   فوراً برمی‌گردد و refresh در پس‌زمینه (single-flight) اجرا می‌شود — request هرگز
   بلاک نمی‌شود. TTL = 180s.
3. **cron `refresh-market-rates` کش صفحات را هم پر می‌کند** (`primeMarketRatesCache`)
   — قبلاً فقط DB را به‌روز می‌کرد و صفحات هنوز منتظر انقضای کش بودند.

> ⛔ timeout ها را به ۱۰+ ثانیه برنگردان. اگر منبعی کند/خاموش است، assembler از
> ۷ fallback پشت‌سر هم استفاده می‌کند — سریع fail شدن بهتر از بلاک‌کردن hero است.

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
| `P3018: column ... already exists` در migrate deploy | drift بین مایگریشن‌ها و DB (ستون با db push/دستی اضافه شده) | ر.ک «تعمیر مایگریشن drift» پایین |

### ⛔ قانون timeout بیرونی (Upstash/Redis) — 2026-08-12

> هر فراخوانی شبکهٔ بیرونی در مسیر بحرانی باید **سقف زمانی سخت** داشته باشد — همان اصل
> «هرگز روی scrape بلاک نشو» در نرخ بازار. بدون سقف، روی شبکه‌های پر-latency
> (مثلاً افغانستان → Upstash اروپا) هر فراخوانی ۰.۵ تا ۵+ ثانیه طول می‌کشید و **کل سایت**
> روی L1-miss صفحات (tiered-cache) یا اکشن‌ها (rate-limiter) بلاک می‌شد.

- **مبنای رسمی:** داک Upstash «Request Timeout» — `signal: () => AbortSignal.timeout(ms)`
  روی کلاینت (upstash.com/docs/redis/sdks/ts/advanced).
- **پیاده‌سازی (در هر سه کلاینت):** `redis-cache.ts` (۲s)، `rate-limiter.ts` (۲s)،
  `edge-maintenance.ts` (۱s). هر call-site جدید که `Redis` می‌سازد باید signal داشته باشد.
- **L2 روی مسیر رندر:** `tiered-cache` خواندن L2 را با بودجهٔ ۲۰۰ms race می‌کند — سقف
  کلاینت فقط backstop است؛ مسیر رندر هیچ‌وقت منتظر Redis کامل نمی‌ماند.
- **rate-limiter:** از آپشن `timeout` خود Ratelimit استفاده نکن — طبق داک رسمی آن آپشن
  روی timeout **fail-open** می‌کند؛ با signal کلاینت، TimeoutError می‌گیریم و سیاست
  fail-closed برای auth حفظ می‌شود (ر.ک `rate-limiter.ts`).

### تعمیر مایگریشن drift (P3018)

اگر `prisma migrate deploy` با «column already exists» یا «failed to apply» شکست:

```bash
# روی همان DB (prod هم از همین RDS استفاده می‌کند — یک DB مشترک است):
npx prisma migrate resolve --applied <migration_name> --schema=./prisma/schema.prisma
# سپس دیپلوی را دوباره اجرا کن:
gh workflow run 'Deploy to Heroku'
```

> ⚠️ پس از resolve هرگز فایل مایگریشن را ویرایش نکن — رکورد checksum می‌شکند.
> اگر مایگریشن واقعاً باید idempotent شود، یک مایگریشن جدید با `IF NOT EXISTS` بساز.

---

## امنیت حساب مالک (OWNER) — لایه‌های دفاعی

مالک **کاملاً از کاربران جدا** است و چند لایه محافظت دارد:

### جلوگیری (Prevention)
1. **ساخت فقط از `/setup`** — سید/اسکریپت/دیپلوی هرگز مالک نمی‌سازند (`SEED_OWNER_*` حذف شد).
   یک‌بار برای همیشه؛ ساخت دوم با تراکنش Serializable + بررسی اتمی بلاک می‌شود.
2. **هش قوی‌تر از کاربران عادی** — bcrypt cost 13 (کاربران عادی 12)؛ OWASP حداقل 10.
3. **2FA اجباری و دائمی** — ورود مالک بدون 2FA به صفحه‌ی فعال‌سازی هدایت می‌شود؛
   غیرفعال‌کردن 2FA برای مالک بسته است. هر ورود بعدی challenge TOTP می‌گیرد.
4. **Rate-limit چندلایه** — setup (سراسری)، ورود (per-email + per-IP در authorize)،
   تأیید TOTP، و همه‌ی مسیرهای auth؛ نوع auth در نبود Redis **fail-closed** است.
5. **IP-allowlist برای /setup** — در production با `ALLOWED_SETUP_IPS` فقط از IPهای مجاز.
6. **غیرقابل‌ویرایش/حذف از طریق سایت** — hierarchy در userActions/role-actions هر تغییری
   روی ردیف OWNER (حتی توسط OWNER دیگر) را بلاک می‌کند؛ لیست مالک‌ها فقط برای OWNER.
7. **wipe سید مالک را حفظ می‌کند** — `SEED_WIPE=true` روی production نمی‌تواند مالک را حذف کند.

### تشخیص (Detection) — همه در `AuditLog` / داشبورد audit-log
- `OWNER_LOGIN`, `OWNER_LOGIN_FAILED`, `OWNER_LOGIN_2FA_CHALLENGE`, `OWNER_LOGIN_2FA_PENDING`
  (با IP کلاینت) — هر تلاش ورود/تغییر روی حساب مالک ثبت می‌شود.
- `OWNER account created` در `SystemLog` (source=SETUP).
- بازیابی رمز مالک → هشدار در `SystemLog` (source=AUTH).

### بازیابی (Recovery) — اگر حساب مالک قفل/هک شد
1. **از دست رفتن Authenticator** → کدهای پشتیبان ۸تایی (در فعال‌سازی 2FA نمایش داده می‌شوند).
2. **قفل کامل** → بازیابی مستقیم از دیتابیس (مالک به RDS دسترسی دارد):
   ```sql
   -- 1) رمز جدید با bcrypt بساز (cost 13) و جایگزین کن:
   --    node -e "console.log(require('bcryptjs').hashSync('رمزقوی-تازه', 13))"
   -- 2) 2FA را ریست کن تا بتواند دوباره از /dashboard/edit-profile فعال کند:
   UPDATE "User" SET "password"='<hash>', "twoFactorEnabled"=false,
          "twoFactorSecretEnc"=NULL, "twoFactorSecret"=NULL, "tokenVersion"="tokenVersion"+1
   WHERE "role"='OWNER';
   --    (بعد از ورود، 2FA دوباره اجباری می‌شود — اولین کار فعال‌سازی آن است)
   ```
3. **هک کامل (رمز+2FA عوض شد)** → همین کوئری بالا را اجرا کن؛ ورود بعدی با 2FA اجباری
   دوباره امن است. چون فقط مالک به RDS دسترسی دارد، هیچ راهی از داخل سایت برای
   بازگرداندن حساب هک‌شده وجود ندارد (عمدی).

### زیرساخت (باید ست شود)
- **`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` روی Heroku** — بدون آن،
  rate-limit در حافظه‌ی همان dyno است و با چند dyno ضعیف می‌شود. این تنها شکاف زیرساختی
  فعلی است.
- **`AUTH_SECRET`** باید قوی و یکتا باشد (JWT امضا می‌شود).
- **`ALLOWED_SETUP_IPS`** روی Heroku — بعد از ساخت مالک، `/setup` دیگر قابل استفاده نیست؛
  برای لایه‌ی اضافه، IP خودت را ست کن.

---

## قوانین طلایی (برای همیشه)

1. **روش واحد = push به `main`** — همه از همین استفاده کنند.
2. **استک `container`** — اگر کسی دید اپ روی stack عادی است: `heroku stack:set container` + redeploy.
3. **`CRON_SECRET` در دو سمت** — بعد از تغییر، در Heroku و GitHub هم‌زمان عوض کن.
4. **فرمت تصویر `webp`** را در `next.config.ts` به `avif` برنگردان (بازگشت کرش‌های حافظه).
5. **مستندات را فقط به‌روز کن، روش را نه** — اگر روش بهتری یافتی، اول این سند را به‌روز کن بعد اجرا.
6. **مالک را از seed/Wipe حذف نکن** — ساخت مالک فقط از `/setup`؛ wipe باید مالک را حفظ کند.
7. **`SEED_OWNER_PASSWORD` را هرگز برنگردان** — این متغیر عمداً حذف شد تا هیچ مسیر جانبی
   برای ساخت مالک دوم وجود نداشته باشد.
