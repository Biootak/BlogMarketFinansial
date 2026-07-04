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

```bash
# Database
docker exec -t fm-blog-db pg_dump -U blog_owner blog | gzip > backup-$(date +%F).sql.gz
# یا اگه Postgres بیرون از داکر است
pg_dump $DATABASE_URL | gzip > backup-$(date +%F).sql.gz

# آپلودها
tar -czf uploads-$(date +%F).tar.gz public/uploads/
```

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