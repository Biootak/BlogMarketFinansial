# 🖥️ معماری هاستینگ — بازار صرافی افغانستان

> **آخرین بروزرسانی:** ۱۵ آگوست ۲۰۲۶  
> **معماری فعلی:** Heroku (اپ) + Heroku Postgres (DB) + GitHub Actions (deploy/cron)
> ⛔ **Vercel منسوخ است (دستور مالک ۲۰۲۶-۰۸-۰۹)** — همهٔ زیرساخت فقط Heroku است؛
> این سند مقایسهٔ تاریخی است و دیگر گزینه‌ای برای انتخاب نیست. ر.ک `deploy/HEROKU.md`.

---

---

## ✅ معماری فعلی (فعال)

```
┌─────────────────────────────────────────────────────────┐
│                    کاربران / Cloudflare DNS              │
│                   financialmarket.page                   │
└──────────────────────────┬──────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │     Render Free         │
              │  Next.js 16 (Docker)    │
              │  Frankfurt — 512MB RAM  │
              │  NODE_OPTIONS=400MB     │
              │  $0/ماه                 │
              └────────────┬────────────┘
                           │ Prisma (pool=3)
              ┌────────────▼────────────┐
              │  Heroku Essential-0     │
              │  PostgreSQL 18          │
              │  eu-west-1 (Ireland)    │
              │  1 GB / 20 connections  │
              │  $5/ماه                 │
              └─────────────────────────┘

              ┌─────────────────────────┐
              │   GitHub Actions        │
              │   هر ۵ دقیقه           │
              │   scrape TGJU →         │
              │   POST /api/cron/push-rates │
              │  $0 (رایگان)            │
              └─────────────────────────┘

              ┌─────────────────────────┐
              │   Uptime Robot (رایگان) │
              │   هر ۵ دقیقه ping       │
              │   Render نمی‌خوابد      │
              └─────────────────────────┘
```

### هزینه ماهانه
| سرویس | پلن | هزینه |
|-------|-----|-------|
| **Heroku** | Basic web dyno | **$7** (داخل اعتبار دانشجویی) |
| **Heroku Postgres** | Essential-0 (1 GB) | **$5** (از $13 دانشجویی) |
| **GitHub Actions** | Free tier | **$0** |
| **Uptime Robot** | Free (50 monitors) | **$0** |
| **Cloudflare** | Free | **$0** |
| **جمع** | | **$12/ماه** |

---

## 📋 راهنمای راه‌اندازی Render

### ۱. ثبت‌نام
→ https://render.com (با GitHub login کن)

### ۲. ساخت Web Service جدید
1. **New → Web Service**
2. **Connect Repository:** `Biootak/BlogMarketFinansial`
3. **تنظیمات:**
   - Name: `financialmarket`
   - Region: **Frankfurt (EU)**
   - Branch: `main`
   - Runtime: **Docker**
   - Dockerfile Path: `./Dockerfile.heroku`
   - Plan: **Free**

### ۳. Environment Variables (مقادیر حساس)
در Render Dashboard → Environment، این متغیرها را با مقادیر واقعی ست کن:

```
DATABASE_URL=<از Heroku Dashboard → Settings → Config Vars>
DIRECT_URL=<همان DATABASE_URL>
AUTH_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
NEXTAUTH_SECRET=<همان AUTH_SECRET>
AUTH_GITHUB_ID=<از GitHub OAuth App>
AUTH_GITHUB_SECRET=<از GitHub OAuth App>
AUTH_GOOGLE_ID=<از Google Cloud Console>
AUTH_GOOGLE_SECRET=<از Google Cloud Console>
CRON_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
RESEND_API_KEY=<از Resend Dashboard>
S3_ACCESS_KEY=<از S3 Provider>
S3_SECRET_KEY=<از S3 Provider>
TELEGRAM_BOT_TOKEN=<از BotFather>
TELEGRAM_WEBHOOK_SECRET=<یک رشتهٔ تصادفی>
BACKUP_S3_PRIMARY_ACCESS_KEY=<از Backblaze B2>
BACKUP_S3_PRIMARY_SECRET_KEY=<از Backblaze B2>
```

> ⚠️ `DIRECT_URL` باید همان `DATABASE_URL` باشد (برای Prisma migrations)

### ۴. Build arguments
در Render → Settings → Build & Deploy → Docker Build Args:
```
DATABASE_URL=<همان DATABASE_URL بالا>
AUTH_SECRET=<همان AUTH_SECRET بالا>
```

### ۵. Custom Domain
- Render → Settings → Custom Domains → `financialmarket.page`
- در Cloudflare DNS: CNAME یا A record به آدرسی که Render می‌دهد

### ۶. Uptime Robot
→ https://uptimerobot.com (رایگان)
- **New Monitor → HTTP(S)**
- URL: `https://financialmarket.page/api/ping`
- Interval: **5 دقیقه**
- این جلوگیری می‌کند Render Free بخوابد

---

## 🔄 بعد از راه‌اندازی Render

### قطع کردن Heroku web dyno (فقط DB نگه دار)
```bash
# web dyno را خاموش کن — DB دست نخورده می‌ماند
heroku ps:scale web=0 -a financial-market

# تأیید
heroku ps -a financial-market
# باید نشان دهد: No dynos running
```

> ⚠️ این کار $7/ماه صرفه‌جویی می‌کند (Basic dyno حذف می‌شود، فقط $5 Essential-0 می‌ماند)

---

## 🗂️ مقایسه گزینه‌های جایگزین (برای مرجع)

### مقایسه پلن‌های Next.js hosting

| سرویس | پلن | RAM | هزینه | مناسب برای |
|-------|-----|-----|-------|------------|
| **Render** | Free | 512 MB | **$0** | ✅ الان (با Uptime Robot) |
| **Render** | Starter | 512 MB | $7/ماه | وقتی بیشتر از 1 instance لازم شد |
| **Render** | Standard | 2 GB | $25/ماه | production جدی |
| **Vercel** | Hobby | — | $0 | نه — Heroku DB + Vercel = latency بد |
| **Railway** | Trial | 512 MB | $5 credit | جایگزین Render (همان قیمت) |
| **Fly.io** | Free | 256 MB | $0 | کوچک‌تر از Render |

### مقایسه پلن‌های Heroku Postgres

| پلن | Storage | Connection Limit | قیمت/ماه |
|-----|---------|-----------------|---------|
| **Essential-0** ← فعلی | **1 GB** | **20** | **$5** |
| Essential-1 | 10 GB | 20 | $9 |
| Essential-2 | 32 GB | 40 | $20 |
| Standard-0 | 64 GB + 4GB RAM | 200 | $50 |

> نکته: پلن‌های Essential جدید (از ۲۰۲۴) **سقف ردیف ندارند** — محدودیت فقط حجم
> ذخیره‌سازی است (Essential-0 = 1 GB). دیتابیس فعلی فقط ~۱۸MB حجم دارد؛
> downgrade از Essential-1 امن است.

---

## 📊 وضعیت Memory (بعد از بهینه‌سازی)

| وضعیت | RAM |
|-------|-----|
| Cold start | ~65 MB |
| بیکار (idle) | ~81 MB |
| بعد از scraping (کد قدیمی) | ~188 MB 🔴 |
| بعد از deploy کد جدید | ~90-110 MB ✅ |
| سقف Render Free | 512 MB |

**تغییرات بهینه‌سازی:**
- `safe-cache`: max entries 1000→300, max bytes 100MB→50MB
- `pageview LRU`: 10,000→2,000 entries
- `backup limits`: posts 500، users 5k، comments 1k
- `tgju.ts`: force-cache→no-store + parallel→sequential
- `refresh-market-rates`: دیگر scraping نمی‌کند (فقط snapshot)
- `GitHub Actions`: scraping هر ۵ دقیقه (خارج از web dyno)
- `NODE_OPTIONS`: --max-old-space-size=400 (Render 512MB)
- `PRISMA_CONNECTION_LIMIT=3` (Essential-1 max 20 connections)

---

## ⚡ GitHub Actions Workflow

فایل: `.github/workflows/refresh-market-rates.yml`  
- اجرا: هر ۵ دقیقه (`cron: '*/5 * * * *'`)
- کار: scrape TGJU → POST به `/api/cron/push-rates`
- Secrets لازم: `APP_URL`, `CRON_SECRET`, `DATABASE_URL`, `USDT_PREMIUM_PERCENT`

---

## 🔜 مرحله بعد (وقتی مشتری آمد)

```
گزینه ارزان‌ترین (بدون Heroku):
  App + DB روی Hetzner CX32:
    4 vCPU / 8 GB RAM / 80 GB SSD
    PostgreSQL self-hosted
    هزینه: ~€8.29/ماه ($9)
    پرداخت: PayPal/کارت

گزینه راحت‌ترین (با Heroku DB):
  App: Heroku Basic ($7) یا Hetzner
  DB:  Heroku Essential-0 ($5)
  کل: ~$12/ماه
```

---

*منابع: render.com/pricing، devcenter.heroku.com/articles/heroku-postgres-plans، uptimerobot.com — بررسی ۱۳ آگوست ۲۰۲۶*
