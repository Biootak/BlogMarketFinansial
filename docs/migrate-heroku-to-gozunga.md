# مهاجرت از Heroku به گوزونگا Cloud

گام‌به‌گام: انتقال دیتابیس، کد، env vars و cron. در طول مهاجرت سایت روی Heroku
زنده می‌ماند و در پایان فقط DNS جابه‌جا می‌شود (downtime تقریباً صفر).

---

## گام ۰ — پیش‌نیازها

- اکانت گوزونگا ([ثبت‌نام](https://gozunga.com) — ۱۰۰ دلار اعتبار رایگان)
- [OpenTofu](https://opentofu.org/docs/intro/install/) + [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
- SSH key در پورتال گوزونگا (Portal → Compute → Key Pairs)
- Application Credentials (Portal → Access → Application Credentials)

## گام ۱ — خروجی env vars از Heroku

```bash
heroku config -a your-app > heroku-config.txt
```

> ⚠️ `heroku config` مقدارها را plaintext چاپ می‌کند — فایل را بعداً پاک کن.

## گام ۲ — خروجی دیتابیس از Heroku Postgres

```bash
# URL دیتابیس را بگیر
heroku config:get DATABASE_URL -a your-app

# dump کامل (فرمت custom — همان فرمت scripts/restore-db.mjs)
pg_dump --format=custom --no-owner --no-privileges \
  "$(heroku config:get DATABASE_URL -a your-app)" > pre-migration.dump

# بررسی سلامت
pg_restore --list pre-migration.dump | head -20
```

> اگر `pg_dump` محلی قدیمی‌تر از نسخهٔ Postgres هروکو بود، از add-on
> `heroku pg:backups:capture` + `heroku pg:backups:download` استفاده کن.

## گام ۳ — بالا آوردن سرور گوزونگا

```bash
cd deploy/gozunga
cp example-openrc my-project.openrc && nano my-project.openrc   # credentials
source my-project.openrc
cp terraform.tfvars.example terraform.tfvars && nano terraform.tfvars
nano cloud-init/nextjs-postgres.yaml   # REPO_URL و BRANCH خودت

tofu init
tofu plan
tofu apply        # → public_ip را یادداشت کن
```

## گام ۴ — انتقال env vars

```bash
# نسخهٔ قبلی .env هروکو را به‌روی سرور جدید بفرست
scp .env ubuntu@<public_ip>:/var/www/fm-blog/.env

# روی سرور: مقادیر Heroku را با مقادیر جدید جایگزین کن
ssh ubuntu@<public_ip>
nano /var/www/fm-blog/.env
#   - DATABASE_URL / DIRECT_URL → localhost (cloud-init خودش ساخته — مقدار پیش‌فرض را نگه دار)
#   - NEXTAUTH_URL / NEXT_PUBLIC_APP_URL → دامنهٔ واقعی
#   - CRON_SECRET → همان مقدار Heroku (یا جدید — فرقی ندارد)
#   - RESEND_API_KEY ، AUTH_GOOGLE_* ، NEXT_PUBLIC_SUPABASE_* → همان مقادیر قبلی
#   - S3_ENDPOINT / S3_ACCESS_KEY / S3_SECRET_KEY / S3_BACKUP_BUCKET → گوزونگا
#   - BACKUP_S3_SECONDARY_* → مقصد دوم (Backblaze B2 و…)
```

## گام ۵ — انتقال دیتا

```bash
# dump هروکو را روی سرور بفرست
scp pre-migration.dump ubuntu@<public_ip>:/tmp/

# روی سرور: restore
ssh ubuntu@<public_ip>
cd /var/www/fm-blog
node scripts/restore-db.mjs --file /tmp/pre-migration.dump --drop-first

# چک کن
node scripts/db-stats.js
```

> نکته: cloud-init هنگام build همان `prisma migrate deploy` را اجرا کرده؛
> restore روی همان schema می‌نشیند. اگر migration جدیدی بعداً آمد:
> `cd /var/www/fm-blog && npm run postinstall` (یا `npx prisma migrate deploy`).

## گام ۶ — DNS و SSL

```bash
# در DNS ثبت دامنه: رکورد A  →  <public_ip>
# سپس روی سرور:
certbot --nginx -d your-domain.com -d www.your-domain.com
```

بعد از propagate شدن DNS (چند دقیقه تا چند ساعت)، سایت از گوزونگا سرو می‌شود.

## گام ۷ — بکاپ و cron

- خط cron شبانهٔ بکاپ توسط cloud-init نصب شده (`/etc/cron.d/fm-blog`).
- سه endpoint اپ (`publish-scheduled-posts`، `refresh-market-rates`،
  `sync-bazaar`) هم در همان فایل هستند — **دامنهٔ YOUR_DOMAIN را در آن**
  **با دامنهٔ واقعی عوض کن** و `service cron restart`.
- اولین بکاپ دستی: `cd /var/www/fm-blog && node scripts/backup-db.mjs --verbose`

## گام ۸ — تست و حذف Heroku

```bash
# تست سلامت از روی گوزونگا
curl -I https://your-domain.com
# لاگ اپ
journalctl -u fm-blog -f

# فقط وقتی مطمئن شدی (کد/دیتا/بکاپ روی گوزونگا کار می‌کند):
heroku apps:destroy -a your-app
```

> قبل از destroy، یک بکاپ نهایی از Heroku بگیر و در جایی خارج از Heroku نگه دار
> (هر دو مقصد S3 اسکریپت بکاپ را پر کن). قانون 3-2-1: هیچ‌وقت آخرین نسخهٔ
> دیتا را فقط روی پلتفرمی که می‌خواهی ترک کنی نگه ندار.

## ریسک‌ها و نکته‌ها

- **AUTH_SECRET جدید** → همهٔ نشست‌ها invalid می‌شوند؛ کاربران دوباره login
  می‌کنند. اگر نمی‌خواهی، همان مقدار Heroku را نگه دار.
- **cron های Heroku** (اگر با `heroku scheduler` بودند) بعد از destroy می‌میرند
  — معادل‌شان همین الان در `/etc/cron.d/fm-blog` سرور جدید هست.
- **آپلودها (public/uploads)** — اگر قبلاً فقط روی دیسک Heroku بودند،
  `BACKUP_INCLUDE_UPLOADS=1` بگذار و بعد از restore دیتا، آن‌ها را هم برگردان.
- حجم بلوکی دیتابیس (`db_volume_size_gb=20`) — اگر دیتای Heroku بزرگ‌تر است،
  قبل از apply مقدار را زیاد کن.
