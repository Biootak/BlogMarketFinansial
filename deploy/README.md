# Deploy روی هاست شخصی (VPS / Dedicated)

این پوشه شامل همه چیزی است که برای بالا آوردن پروژه روی یک سرور لینوکسی
(مثلاً Ubuntu 22.04 / 24.04 یا Debian 12) لازم داری. پروژه هیچ وابستگی
به Vercel ندارد و همان کدی که در development می‌بینی در production هم
اجرا می‌شود.

## دو روش deploy

### روش ۱ — Docker Compose (ساده‌تر)

اگه Docker روی سرورت نصبه، فقط:

```bash
# روی سرور
git clone <repo>
cd <repo>
cp .env.example .env
# .env را با مقادیر واقعی پر کن (DATABASE_URL, NEXTAUTH_URL, ...)
nano .env
docker compose up -d --build
```

سرویس `cron` در `docker-compose.yml` خودش هر دقیقه endpointهای لازم
را صدا می‌زند؛ نیازی به تنظیم system cron نیست.

### روش ۲ — نصب مستقیم با PM2 (روش کلاسیک)

```bash
# روی سرور (به عنوان root یا sudo)
sudo ./deploy/install.sh
```

این اسکریپت:
1. Node.js 20، Nginx، PM2 را نصب می‌کند.
2. کاربر سیستمی `fmblog` می‌سازد.
3. پروژه را در `/var/www/fm-blog` کپی و build می‌کند.
4. Nginx را با config نمونه فعال می‌کند.
5. SSL رایگان Let's Encrypt را از طریق certbot می‌گیرد.
6. crontab را در `/etc/cron.d/fm-blog-cron` نصب می‌کند.

---

## ساختار فایل‌ها

| فایل                              | کاربرد                                                  |
|-----------------------------------|---------------------------------------------------------|
| `install.sh`                      | اسکریپت نصب یک‌شات (روش ۲)                            |
| `ecosystem.config.cjs`            | تنظیمات PM2 (process manager)                          |
| `nginx.conf.example`              | قالب Nginx (reverse proxy + SSL)                      |
| `crontab.example`                 | زمان‌بندی سه endpoint cron (پست‌ها، نرخ‌ها، TGJU)      |
| `README.md`                       | همین فایل                                              |

---

## سه endpoint cron که روی سرور اجرا می‌شوند

هر کدام از این endpointها باید از یک cron job فراخوانی شوند:

| Endpoint                              | هر چند وقت؟ | کار                              |
|---------------------------------------|-------------|----------------------------------|
| `/api/cron/publish-scheduled-posts`   | ۱ دقیقه     | انتشار پست‌های زمان‌بندی‌شده    |
| `/api/cron/refresh-market-rates`      | ۱ دقیقه     | refresh نرخ‌های بازار (USDT/FX) |
| `/api/cron/sync-bazaar`               | ۱۰ دقیقه    | scrape از TGJU                   |

**روش‌های صدا زدن (هر کدام معتبر است):**
```bash
# Bearer token
curl -H "Authorization: Bearer $CRON_SECRET" https://site.com/api/cron/...

# یا x-cron-secret header
curl -H "x-cron-secret: $CRON_SECRET" https://site.com/api/cron/...

# یا query string
curl "https://site.com/api/cron/...?secret=$CRON_SECRET"
```

**بدون `CRON_SECRET` در env، endpoint با status 503 غیرفعال می‌ماند.**

---

## environment variables مهم برای production

```bash
# حتماً قبل از deploy ست کن
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
CRON_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# اختیاری ولی توصیه‌شده
PRISMA_CONNECTION_LIMIT=10
PRISMA_POOL_TIMEOUT=30
DEBUG_MODE=false
SETUP_PREVIEW_MODE=false
EMAIL_PROVIDER=resend
TGJU_SCRAPER_ENABLED=true
```

---

## دستورات پس از deploy

```bash
# وضعیت
pm2 status
pm2 logs fm-blog

# ری‌استارت
pm2 restart fm-blog

# آپدیت (پس از git pull)
cd /var/www/fm-blog
git pull
npm ci
npm run build
pm2 restart fm-blog

# یا با npm script
npm run deploy:rebuild
```

---

## پشتیبان‌گیری

پروژه دو لایه بکاپ دارد:

### ۱) بکاپ JSON اپ (داخل خود اپ)

`/api/cron/backup` (با CRON_SECRET) از تمام جداول مهم snapshot JSON می‌گیرد،
روی `backups/` ذخیره و در S3-compatible (باکت `S3_BACKUP_BUCKET`) آینه می‌کند.
این بکاپ برای بازیابی سریعِ محتوای اپ (پست‌ها، کاربران، تنظیمات) کافی است.

### ۲) بکاپ واقعی Postgres با pg_dump (توصیه‌شده برای DR)

`scripts/backup-db.mjs` بکاپ کامل دیتابیس (schema + داده + sequences) را با
`pg_dump -Fc` می‌گیرد و طبق قانون 3-2-1 در **دو مقصد S3-compatible** آپلود
می‌کند — مقصد اصلی (مثلاً Object Storage گوزونگا) و مقصد دوم خارج از پلتفرم
(Backblaze B2 / R2 / MinIO روی سرور دیگر) تا با حذف اکانت یا VM از بین نرود.

```bash
# بکاپ دستی
node scripts/backup-db.mjs --verbose

# لیست بکاپ‌ها و بازیابی
node scripts/restore-db.mjs --list
node scripts/restore-db.mjs --file pg_2026-08-09_...dump --drop-first

# تست خشک (فقط نمایش پیکربندی)
node scripts/backup-db.mjs --dry-run
```

متغیرهای محیطی لازم (در `.env`):

```bash
# مقصد اصلی — اگر ست نشود از S3_ENDPOINT / S3_ACCESS_KEY / S3_SECRET_KEY / S3_BUCKET_NAME استفاده می‌کند
BACKUP_S3_PRIMARY_ENDPOINT=https://s3.gozunga.com
BACKUP_S3_PRIMARY_ACCESS_KEY=...
BACKUP_S3_PRIMARY_SECRET_KEY=...
BACKUP_S3_PRIMARY_BUCKET=your-private-backup-bucket

# مقصد دوم (خارج از پلتفرم — قانون 3-2-1)
BACKUP_S3_SECONDARY_ENDPOINT=https://s3.us-west-004.backblazeb2.com
BACKUP_S3_SECONDARY_ACCESS_KEY=...
BACKUP_S3_SECONDARY_SECRET_KEY=...
BACKUP_S3_SECONDARY_BUCKET=fm-blog-backups

# اختیاری
BACKUP_RETENTION_LOCAL=14        # چند نسخهٔ آخر لوکال بماند
BACKUP_RETENTION_S3=30           # چند نسخهٔ آخر در هر مقصد S3 بماند
BACKUP_INCLUDE_UPLOADS=1         # public/uploads هم بکاپ شود
```

⚠️ **پیش‌نیاز:** روی سرور باید `pg_dump` نصب باشد (`apt install postgresql-client`).
نسخهٔ pg_dump نباید از نسخهٔ سرور Postgres قدیمی‌تر باشد.

سطر cron (روی هاست/VPS، هر شب ۰۳:۳۰):

```
30 3 * * * cd /var/www/fm-blog && node scripts/backup-db.mjs >> backups/cron.log 2>&1
```

برای بازیابی کامل (بعد از از دست رفتن سرور): سرور جدید را بالا بیاور،
اسکریپت را اجرا کن تا بکاپ از S3 دانلود شود و `pg_restore` کن — یعنی همان
`node scripts/restore-db.mjs --file <name> --drop-first`.

---

## عیب‌یابی

```bash
# لاگ PM2
pm2 logs fm-blog --lines 200

# لاگ Nginx
sudo tail -f /var/log/nginx/fm-blog.error.log

# لاگ cron
sudo tail -f /var/log/fm-cron.log

# تست دستی endpoint (با CRON_SECRET واقعی)
curl -i -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron/sync-bazaar
```

اگه 503 گرفتی یعنی `CRON_SECRET` در env اپ تنظیم نشده.
اگه 401 گرفتی یعنی مقدار env با مقدار crontab یکی نیست.