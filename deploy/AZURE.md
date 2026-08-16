# Deploy on Azure (Azure for Students) — Financial Market Blog

> وضعیت: ۲۰۲۶-۰۸-۱۶ — مهاجرت از Heroku به Azure VM در حال انجام.
> آرشیو راهنمای قبلی (Heroku): `deploy/HEROKU.md`

---

## 🏗️ معماری نهایی (همه با آفر دانشجویی — تقریباً صفر هزینه)

| سرویس | منبع Azure | پلن | هزینه |
|---|---|---|---|
| 🌐 وب‌اپلیکیشن (Next.js) | VM `fm-vm` — **Standard_B2ats_v2** (2 vCPU / 1 GiB) | رایگان: **750h/ماه** (B2ats v2 در آفر دانشجویی) | $0 |
| 🗄️ دیتابیس | PostgreSQL Flexible Server `fm-pg` — **Standard_B1ms** + 32GB | رایگان: **750h/ماه + 32GB** (آفر دانشجویی) | $0 |
| 💾 دیسک OS | Managed Disk StandardSSD 32GB | رایگان: 64GB×2 P6 در آفر | $0 |
| 🧰 رجیستری (اختیاری) | ACR `fmacr2026` (Standard, 100GB) | رایگان در آفر | $0 (فعلاً استفاده نمی‌شود) |
| 🌐 IP استاتیک | Public IP Standard `fm-vm-ip` | — | ~$3.6/ماه (فقط همین هزینه) |
| 🌍 Bandwidth | 15GB خروجی/ماه (۱۲ ماه اول) + 100GB always-free | — | $0 (در سقف می‌مانیم) |

**نکته درباره 12 ماه:** بعد از پایان ۱۲ ماه، VM و Postgres پولی می‌شوند (~$19/ماه). آن موقع می‌توان به Container Apps (always-free با scale-to-zero) یا کوچک‌سازی مهاجرت کرد.

**چرا B2ats_v2؟** VM رایگان آفر دانشجویی ۲۰۲۶ = `B1s` (0.5GB) / `B2pts v2` (Arm) / `B2ats v2` (AMD) — هر کدام 750h. B2ats_v2 بهترین گزینه است (2 vCPU / 1GiB). گزینه 4GiB (`B2als_v2`) **رایگان نیست** (~$15/ماه). RAM کافی است چون دیتابیس روی Azure است نه روی VM؛ swap 8G + `NODE_OPTIONS=--max-old-space-size=256` هم اضافه شده.

---

## 🗺️ چیدمان VM (Ubuntu 24.04)

```
nginx (80/443) → 127.0.0.1:3000  ← کانتینر web (fm-blog-web:latest)
                                     کانتینر cron (fm-blog-cron:latest) → http://web:3000/api/cron/*
```

- کد: `~/fm-blog` (clone از GitHub — رپو پابلیک است)
- compose: `~/fm-blog/deploy/docker-compose.azure.yml` (سرویس db ندارد — DB خارجی Azure)
- .env: `~/fm-blog/.env` (از کانفیگ Heroku + DATABASE_URL جدید Azure)
- دیتابیس: `fm-pg.postgres.database.azure.com:5432/blog` (sslmode=require)
- فایروال Postgres: فقط IP لوکال + IP VM (`20.109.177.20`)

## 🚀 دیپلوی روزمره — push به GitHub (روش استاندارد — فقط همین را استفاده کن)

> **قانون:** آپدیت سایت فقط با یک کار انجام می‌شود: **`git push origin main`**.
> هیچ دستور دستی روی VM لازم نیست. این روش مرجع واحد است؛ روش قبلی (Heroku) منسوخ شده.

**چطور کار می‌کند (2026-08-16 — build در CI، نه روی VM):**

```
push به main → GitHub Actions (.github/workflows/docker-build-push.yml)
  → build تصویرهای web + cron روی runner قوی (بدون OOM/throttle)
  → push به ghcr.io/biootak/fm-blog-{web,cron}:main
→ cron-poll روی VM هر دقیقه origin/main را fetch می‌کند
  → deploy/azure-update.sh: git pull → docker compose pull (با retry) → up -d → prune
```

**چرا build در CI به‌جای VM؟** B2ats_v2 (1GB RAM، 20% CPU پایه) نمی‌تواند `next build`
پروژهٔ بزرگ را در زمان معقول انجام دهد (npm ci OOM می‌خورد و CPU throttle می‌شود — build
قبلی ~۱ ساعت طول می‌کشید و تلاش اول مرد). CI تصویر را در ~۸-۱۲ دقیقه می‌سازد و VM فقط
pull می‌کند (چند دقیقه). **بدون downtime:** تا pull تمام نشود، نسخهٔ قبلی سرویس می‌دهد.

**امنیت تصویر عمومی ghcr:** build در CI به DB وصل نمی‌شود (cacheComponents: false →
`next build` نیاز به DB ندارد) و AUTH_SECRET فقط placeholder است → تصویر حاوی هیچ
داده/راز واقعی نیست؛ رازها فقط در runtime از `.env` روی VM می‌آیند.

**چرا cron-poll؟** رپو پابلیک است → نیازی به secret در GitHub نیست؛ VM فقط بیرون‌کِش می‌کشد؛
نیازی به پورت ورودی جدید یا webhook نیست (NSG فقط 22/80/443).
اگر pull شکست بخورد (CI هنوز build تمام نکرده) → آپدیت ناموفق و نشانگر `.azure-last-deployed`
نوشته نمی‌شود → دقیقهٔ بعد دوباره تلاش می‌شود تا تصویر ظاهر شود.

### نصب (یک‌بار، روی VM)

```bash
cd ~/fm-blog
sudo bash deploy/install-auto-deploy.sh
# اگر clone در مسیر غیرمعمول است: sudo AZURE_REPO_DIR=/home/ubuntu/fm-blog bash deploy/install-auto-deploy.sh
```

بعد از نصب، `/etc/cron.d/fm-blog-azure` ساخته می‌شود و از آن به بعد فقط push کافی است.

### آپدیت دستی / وضعیت / لاگ (روی VM)

```bash
cd ~/fm-blog
bash deploy/azure-update.sh                              # آپدیت دستی همین الان
sudo tail -f /var/log/fm-blog-azure-deploy.log          # لاگ دیپلوی خودکار
docker compose --env-file .env -f deploy/docker-compose.azure.yml ps         # وضعیت کانتینرها
# لاگ اپ / کرون
cd ~/fm-blog
docker compose --env-file .env -f deploy/docker-compose.azure.yml logs -f web
docker compose --env-file .env -f deploy/docker-compose.azure.yml logs -f cron
```

### رول‌بک (بازگشت به نسخهٔ قبلی)

```bash
cd ~/fm-blog
git reset --hard <commit-sha-prev>
bash deploy/azure-update.sh
```

### ⚠️ نکته‌ها

- **روش قدیمی (build روی VM) حذف شد** — `azure-update.sh` دیگر build نمی‌کند، فقط pull
  می‌کند. اگر نیاز به build دستی روی VM بود (مثل دیباگ):
  `docker compose --env-file .env -f deploy/docker-compose.azure.yml build`
  (با `NODE_OPTIONS_BUILD=--max-old-space-size=2048` و صبر ~۱ ساعت — فقط دیباگ).
- فایل‌های `deploy/**` در `paths-ignore` وورک‌فلو هستند → تغییر مستندات/اسکریپت‌های deploy،
  تصویر را دوباره build نمی‌کند (درست است — تصویر فقط به کد اپ وابسته است).
- وورک‌فلوهای قدیمی (`deploy-heroku.yml` و …) legacy هستند و بعد از کامل‌شدن cutover حذف می‌شوند.

---

## 🚀 مراحل مهاجرت (اجرا شده — 2026-08-16)

1. ✅ **VM:** Resource Group `fm-prod` → VM `fm-vm` (westus2, B2ats_v2, 32GB, SSH ed25519) + NSG (فقط 22/80/443) + IP استاتیک `20.109.177.20` + swap 8G + docker/compose/nginx/certbot/pg-client.
2. ✅ **Postgres:** `fm-pg` (norwayeast — نزدیک‌ترین ریجن مجاز به افغانستان، B1ms رایگان، PG16) + DB `blog` + فایروال (لوکال + VM).
3. ✅ **دیتای:** dump از Heroku (pg_dump 18 — چون Heroku روی PG18 است) با حذف `_heroku` schema و خطوط ناسازگار (`transaction_timeout`، `pg_stat_statements`، `default_table_access_method`) → restore به Azure. تأیید: **88 جدول / 9209 ردیف / 15 مایگریشن Prisma**.
4. ✅ **.env:** همه متغیرهای Heroku (S3/Filebase، بکاپ B2، AUTH_SECRET، TOTP_ENCRYPTION_KEY، Telegram، Resend...) + `DATABASE_URL`/`DIRECT_URL` → Azure.
5. ⏳ **Build:** روی VM (ACR Tasks و ghcr هر دو در آفر بلاک/غیرضروری بودند → build لوکال روی VM با swap).
6. ⏳ **nslookup/DNS:** رکورد A دامنه → `20.109.177.20` + TLS با certbot.
7. ⏳ **Cutover:** OAuth callback های Google/GitHub → دامنه جدید، غیرفعال‌کردن cron-job.org، تست کامل، بعد حذف Heroku.

---

## 🔧 بکاپ و بازیابی

- **بکاپ دیتابیس:** روی VM — اسکریپت pg_dump (مطابق BACKUP_S3_* فعلی به B2). (خودکارسازی بعد از تست اولیه)
- **بازیابی:** `pg_restore` با pg client 18.

---

## ⚠️ محدودیت‌ها و نکات

- **Bandwidth 15GB/ماه** (۱۲ ماه اول): تصاویر روی Filebase سرو می‌شوند → ترافیک VM فقط HTML/JSON است. اگر نزدیک سقف شدید: Cloudflare یا Azure CDN.
- **CPU burst:** B2ats_v2 روی 20% پایه است؛ پیک‌های سنگین (مثل rebuild) اعتبار burst مصرف می‌کند و بعد throttle می‌شود.
- **RAM 1GiB:** اپ با `--max-old-space-size=256` اجرا می‌شود (همان مقدار Heroku). اگر کم آمد → B2als_v2 (~$15/ماه).
- **12 ماه بعد:** free amounts تمام می‌شود → برنامه‌ریزی کوچک‌سازی.
