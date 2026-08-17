# 📦 رانبوک مهاجرت ریجن: westus2 / Norway East → UAE North (uaenorth)

> **وضعیت:** ⛔ **بلاک‌شده — 2026-08-17 (اجرای واقعی فاز ۱).** سیاست اشتراک
> `sys.regionrestriction` اجازهٔ ساخت هیچ منبعی در uaenorth را نمی‌دهد — فاز ۱/۲ بدون
> تغییر سیاست قابل اجرا نیست. جزئیات + راه‌حل: **§1.5**. قبل از اجرا، بخش «هشدارها و هزینه» را بخوان.
> **هدف:** کوتاهکردن مسیر کاربران افغانستان/ایران به سرور و حذف فاصلهٔ DB↔Web.
> **منبع حقایق:** اندازهگیری واقعی 2026-08-17 (TTFB ایران→westus2 ≈ ۱.۲–۱.۳s؛
> فاصلهٔ DB (Norway) تا VM (westus2) ≈ ۷۰۰۰km) + در دسترس بودن SKU از API واقعی Azure.

---

## 0. چرا UAE North (با دادهٔ واقعی، نه حدس)

| ریجن | B2ats_v2 (VM) | B1ms (PG) | فاصله تا کابل | نتیجه |
|------|--------------|-----------|----------------|--------|
| **`uaenorth` (دبی)** | ✅ موجود | ✅ موجود | ~۲٬۰۰۰ km | ✅ **انتخاب نهایی** |
| `centralindia` (پونا) | ✅ موجود | ✅ موجود | ~۲٬۳۰۰ km | ⚠️ گزینهٔ دوم |
| `qatarcentral` (قطر) | ❌ **غیرموجود** (فقط اینتل) | ❌ غیرموجود | ~۲٬۱۰۰ km | ❌ حذف |
| `westus2` (فعلی) | ✅ | ✅ | ~۱۱٬۵۰۰ km | فعلی |
| `norwayeast` (DB فعلی) | — | ✅ | ~۴٬۸۰۰ km | فعلی |

> ⚠️ **2026-08-17:** موجودی SKU از API Azure تأیید شده بود، ولی سیاست اشتراک (`sys.regionrestriction`)
> در عمل دیپلوی به uaenorth را **deny** کرد (اولین دستور اجرا: ساخت IP). ر.ک §1.5 — «انتخاب نهایی»
> تا زمان رفع بلوکر عملاً اجرایی نیست.

- **اندازهگیری موجود:** RTT ایران→westus2 ≈ ۱.۲–۱.۳s. با uaenorth این عدد به
  **~۰.۱–۰.۲s** میرسد (با کش Cloudflare حتی کمتر). DB و Web هم در یک ریجن
  میشوند → دیگر +۱۵۰ms cross-region برای هر کوئری نیست.
- هر دو SKU در آفر دانشجویی رایگان‌اند (B2ats v2 و B1ms هر کدام ۷۵۰h/ماه).

---

## 0.1 تحقیق مستقل وب — تأیید انتخاب ریجن (2026-08-17)

> بررسی با منبع رسمی Azure (لیست ریجن‌ها، آخرین به‌روزرسانی 2026-05-29) + جستجوی وب 2026.
> نتیجه: انتخاب `uaenorth` **از نظر جغرافیایی درست است** — نزدیک‌ترین ریجن Azure به افغانستان و ایران.

| ریجن Azure (خاورمیانه/نزدیک، 2026) | فاصله تا کابل | نسبت به uaenorth |
|------------------------------------|---------------|------------------|
| **`uaenorth` (دبی)** | ~۲٬۰۰۰ km | ✅ **نزدیک‌ترین** |
| `qatarcentral` (دوحه) | ~۲٬۱۰۰ km | بیشتر |
| `centralindia` (پونا) | ~۲٬۳۰۰ km | بیشتر |
| `israelcentral` (تل‌آویو) | ~۳٬۰۰۰ km | بیشتر |
| `indiasouthcentral` (حیدرآباد — ریجن جدید GA) | ~۲٬۵۰۰ km | بیشتر |
| `uaecentral` (ابوظبی) | ~۲٬۰۵۰ km | هم‌فاصله (پیر منطقه) |

- **منبع رسمی (May 29, 2026):** https://learn.microsoft.com/en-us/azure/reliability/regions-list — ریجن‌های خاورمیانه فقط این‌ها هستند؛
  هیچ ریجن جدیدی نزدیک‌تر از دبی به افغانستان در دسترس نیست (ترکیه هنوز GA نشده؛ «Saudi Arabia East» ریاض طبق اعلامیهٔ Q4 2026
  هنوز راه نیفتاده و حتی با راه‌اندازی هم از دبی دورتر است — ~۲٬۴۰۰ km).
- **SKU های رایگان:** صفحهٔ رسمی Azure Free Account تأیید می‌کند `B2ats_v2` (AMD-based burstable) و `B1ms` هر دو جزو
  آفر رایگان/دانشجویی‌اند (۷۵۰h هر کدام) → منطق هزینهٔ رانبوک درست است.
- **فاصلهٔ ایران:** دبی ~۱٬۳۰۰ km از تهران — مسیر کابل مستقیم زیردریایی/خلیج؛ حتی بهتر از وضعیت افغانستان.
- ⚠️ **ریسک ژئوپلیتیک (یافتهٔ جدید 2026):** بسته‌شدن تنگهٔ هرمز و قطعی کابل‌های دریایی در جریان جنگ 2026 ایران-آمریکا
  (Strait of Hormuz / Red Sea) ریسک اضافی برای میزبانی در خلیج است. این برای مخاطبِ داخل ایران/افغانستان یعنی
  **Cloudflare CDN لبه مهم‌تر از قبل** — اما انتخاب ریجن همچنان درست است: نزدیک‌ترین گزینهٔ عملی، دبی است.
  (منبع: گزارش‌های 2026 submarine-cable/Strait of Hormuz)
- **نتیجه:** هدف مهاجرت (کوتاه‌کردن مسیر + هم‌ریجن‌کردن DB و Web) با uaenorth محقق می‌شود؛ بلوکر واقعی **سیاست اشتراک** است (§1.5)، نه جغرافیا.

---

## 1. هشدارها و هزینه (قبل از هر چیز بخوان)

| هشدار | جزئیات |
|-------|--------|
| **کوتای 750h/ماه** | آفر دانشجویی: B2ats v2 و B1ms هر کدام **۷۵۰h رایگان در ماه** — هم‌پوشانی دو VM = ۲× ساعت مصرف. ۲۴h هم‌پوشانی ≈ ۷۲۸h (سر جمع) هنوز رایگان؛ **هم‌پوشانی را < ۷ روز نگه دار** تا اضافه‌ی پولی ~$1–3 باشد. بعد از cutover، VM قدیمی را **همان‌روز** deallocate کن. |
| **Cloudflare token** | برای گواهی DNS-01 (قبل از cutover) و تغییر رکورد A لازم است — در دسترس باشد. |
| **pg client** | pg_dump/pg_restore نسخه ≥ 16 (سرور فعلی PG16 است). روی VM قدیمی `postgresql-client` نصب است. |
| **هیچ state روی VM نیست** | آپلودها روی S3/Filebase، state در Postgres → VM جدید فقط docker + .env لازم دارد (همان تصویر ghcr). |
| **رولبک همیشه باز است** | تا ۷ روز بعد از cutover، VM و PG قدیمی را نگه دار → با یک تغییر DNS برمی‌گردی. |

---

## 1.5 ⛔ بلوکر: سیاست ریجن اشتراک (کشف‌شده هنگام اجرای واقعی — 2026-08-17)

> **یاد گرفته شد از اجرای واقعی فاز ۱:** رانبوک موجودی SKU (B1ms / B2ats_v2) را از API Azure
> چک کرده بود، اما **سیاست ریجن اشتراک را نه**. اولین دستور اجرا (`az network public-ip create
> --location uaenorth`) با خطای `RequestDisallowedByAzure` رد شد.

| چک | نتیجهٔ واقعی |
|-----|-------------|
| دستور اجراشده | `az network public-ip create -g fm-prod -n fm-vm-uae-ip --location uaenorth --sku Standard --allocation-method Static` |
| خطا | `ERROR: (RequestDisallowedByAzure) ... This policy maintains a set of best available regions ...` |
| سیاست فعال | `sys.regionrestriction` → تعریف built-in `b86dabb9-b578-4d7b-b842-3b45e95769a1` «Allowed resource deployment regions» — effect: `deny` |
| scope سیاست | `/subscriptions/8085f760-3706-447c-a07b-003e52047640` |
| لیست مجاز (پارامتر) | `westus2`, `norwayeast`, `canadacentral`, `eastus`, `westus` — **uaenorth در لیست نیست** |
| دسترسی لازم برای رفع | Owner روی اشتراک (✅ موجود است) |

**نتیجه:** هیچ منبعی (حتی IP) در uaenorth ساخته نمی‌شود مگر `uaenorth` به
`listOfAllowedLocations` سیاست اضافه شود. هیچ‌کدام از ریجن‌های مجاز فعلی به افغانستان
نزدیک نیستند → هدف کل رانبوک بدون تغییر سیاست قابل اجرا نیست.

**راه‌حل (تغییر governance کل اشتراک — قبل از اجرا تأیید کاربر لازم است):**

```bash
az policy assignment update --name sys.regionrestriction \
  --parameters '{"listOfAllowedLocations":{"value":["westus2","norwayeast","canadacentral","eastus","westus","uaenorth"]}}'
```

- این تغییر **فقط-افزودنی** است (uaenorth اضافه می‌شود، بقیهٔ ریجن‌ها دست‌نخورده می‌مانند) و قابل بازگشت است.
- **قبل از تغییر:** تأیید اینکه SKU های رایگان (B1ms / B2ats_v2) در uaenorth واقعاً مشمول آفر
  دانشجویی هستند — سیاست احتمالاً عمداً به ریجن‌های رایگان محدود شده است.
- دستور بررسی سیاست (برای بازتولید): `az policy assignment show --name sys.regionrestriction --query parameters`

**یافتهٔ جانبی همان اجرا (برای فاز ۱ مهم — ر.ک §2):** ادمین واقعی PG فعلی `fmpgadmin` است
(نه `postgres` که در دستورهای این رانبوک آمده) و رمزِ `.env` داخل `DATABASE_URL` به‌صورت
URL-encoded است → `--admin-password` و اتصال‌های `pg_dump`/`pg_restore` باید یوزر/رمز را
دقیقاً از `.env` فعلی استخراج کنند (decode شده).

---

## 2. فاز ۱ — Postgres جدید در uaenorth

```bash
# ── ۱) ساخت سرور (B1ms رایگان، PG16، 32GB — هم‌ارز فعلی) ──
az postgres flexible-server create \
  -g fm-prod -n fm-pg-uae \
  --location uaenorth \
  --sku-name Standard_B1ms --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --admin-user postgres \
  --admin-password '<رمز از .env فعلی>' \
  --public-access None \
  --yes

az postgres flexible-server db create -g fm-prod -n fm-pg-uae -d blog

# ── ۲) فایروال: IP های لازم ──
NEW_VM_IP='<IP_VM_جدید_از_فاز۲>'
az postgres flexible-server firewall-rule create -g fm-prod -n fm-pg-uae --rule-name vm-new     --start-ip-address "$NEW_VM_IP" --end-ip-address "$NEW_VM_IP"
az postgres flexible-server firewall-rule create -g fm-prod -n fm-pg-uae --rule-name vm-old     --start-ip-address 20.109.177.20 --end-ip-address 20.109.177.20
az postgres flexible-server firewall-rule create -g fm-prod -n fm-pg-uae --rule-name home       --start-ip-address 95.142.115.0  --end-ip-address 95.142.115.255
# allow-azure-services (برای GitHub Actions backup)
az postgres flexible-server firewall-rule create -g fm-prod -n fm-pg-uae --rule-name allow-azure-services --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0

# ── ۳) IP جدید VM را به PG *قدیمی* هم اضافه کن (دورهٔ هم‌زمانی لازم است) ──
az postgres flexible-server firewall-rule create -g fm-prod -n fm-pg \
  --rule-name vm-uae-new --start-ip-address "$NEW_VM_IP" --end-ip-address "$NEW_VM_IP"

# ── ۴) پایه‌گذاری داده: dump + restore (دادهٔ کامل؛ روی PG قدیمی اجرا می‌شود) ──
pg_dump "postgresql://postgres:<PASS>@fm-pg.postgres.database.azure.com:5432/blog?sslmode=require" \
  -Fc --no-owner --no-privileges -f /tmp/blog-base.dump

pg_restore "postgresql://postgres:<PASS>@fm-pg-uae.postgres.database.azure.com:5432/blog?sslmode=require" \
  --no-owner --no-privileges -d blog /tmp/blog-base.dump

# ── ۵) تأیید پایه ──
psql "postgresql://postgres:<PASS>@fm-pg-uae.postgres.database.azure.com:5432/blog?sslmode=require" -c '\dt' | wc -l   # ~88 جدول
```

> ⚠️ برای **Plan A** (پایین): restore کامل کافی است. برای **Plan B** (صفر downtime):
> این مرحله باید **فقط schema** باشد تا subscription کار data-copy را بدون gap انجام دهد:
> `pg_restore ... --schema-only -d blog /tmp/blog-base.dump` — هر دو variant در فاز ۳ توضیح داده شده.

---

## 3. فاز ۲ — VM جدید در uaenorth

```bash
# ── ۱) کلید SSH ──
ssh-keygen -t ed25519 -f ~/.ssh/fm-azure-uae -N "" -C "fm-uae-deploy"

# ── ۲) IP استاتیک (Standard = static؛ ~$3.6/ماه مثل فعلی) ──
az network public-ip create -g fm-prod -n fm-vm-uae-ip \
  --location uaenorth --sku Standard --allocation-method Static

# ── ۳) NSG: فقط 22/80/443 ──
az network nsg create -g fm-prod -n fm-vm-uae-nsg --location uaenorth
az network nsg rule create -g fm-prod --nsg-name fm-vm-uae-nsg -n allow-ssh-http-https \
  --priority 100 --access Allow --protocol Tcp \
  --source-address-prefixes Internet --destination-port-ranges 22 80 443 --direction Inbound
az network nsg rule create -g fm-prod --nsg-name fm-vm-uae-nsg -n deny-rest \
  --priority 1000 --access Deny --protocol '*' --destination-port-range '*' --direction Inbound

# ── ۴) VM (B2ats_v2 رایگان — دقیقاً هم‌ارز فعلی) ──
az vm create -g fm-prod -n fm-vm-uae \
  --location uaenorth \
  --image Ubuntu2404 \
  --size Standard_B2ats_v2 \
  --admin-username azureuser \
  --ssh-key-values ~/.ssh/fm-azure-uae.pub \
  --public-ip-address fm-vm-uae-ip --public-ip-sku Standard \
  --nsg fm-vm-uae-nsg \
  --os-disk-size-gb 32

NEW_VM_IP=$(az network public-ip show -g fm-prod -n fm-vm-uae-ip --query ipAddress -o tsv)
echo "$NEW_VM_IP"   # این را در فاز ۱ (فایروال) هم بگذار
```

### پروویژن روی VM جدید (docker + nginx + cert + auto-deploy)

```bash
ssh -i ~/.ssh/fm-azure-uae azureuser@"$NEW_VM_IP"

# swap 8G (مثل VM فعلی — حیاتی برای 1GB RAM)
sudo fallocate -l 8G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# docker + compose plugin
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker azureuser && newgrp docker   # یا logout/login

# clone + .env (از VM قدیمی — رازها فقط runtime)
git clone https://github.com/biootak/financialmarket.page.git ~/fm-blog
# ⚠️ .env را از VM قدیمی کپی کن (شامل DATABASE_URL قدیم — در فاز ۳ عوض می‌شود):
#   روی VM قدیمی:  scp ~/fm-blog/.env azureuser@<NEW_VM_IP>:fm-blog/.env
#   یا:  scp -i ~/.ssh/fm-azure-deploy ~/fm-blog/.env  azureuser@<NEW_VM_IP>:fm-blog/.env

# nginx (از repo — شامل pin گزیپ 2026-08-17)
sudo sed -e 's/your-domain.com/financialmarket.page/g' \
     ~/fm-blog/deploy/nginx.conf.example \
     | sudo tee /etc/nginx/sites-available/fm-blog > /dev/null
sudo ln -sf /etc/nginx/sites-available/fm-blog /etc/nginx/sites-enabled/fm-blog
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# گواهی TLS *قبل از* cutover — با DNS-01 (چون هنوز DNS روی VM قدیمی است)
sudo apt-get update -qq && sudo apt-get install -y -qq certbot python3-certbot-dns-cloudflare
sudo mkdir -p /etc/letsencrypt
cat <<'EOF' | sudo tee /etc/letsencrypt/cloudflare.ini
dns_cloudflare_api_token = <CLOUDFLARE_API_TOKEN>
EOF
sudo chmod 600 /etc/letsencrypt/cloudflare.ini
sudo certbot certonly --dns-cloudflare --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
  -d financialmarket.page -d www.financialmarket.page \
  --agree-tos -m admin@financialmarket.page --non-interactive

# کانتینرها (این مرحله با DATABASE_URL *قدیمی* بالا می‌آید — هم‌زاد faithful)
cd ~/fm-blog && docker compose --env-file .env -f deploy/docker-compose.azure.yml up -d

# auto-deploy
sudo bash deploy/install-auto-deploy.sh

# healthcheck
curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:3000/
```

> **تأیید قبل از ادامه:** (۱) `curl https://financialmarket.page` با `--resolve financialmarket.page:443:$NEW_VM_IP`
> TLS سبز میدهد؛ (۲) کانتینر web healthy است و به DB **قدیمی** وصل است (هم‌زاد).
> renewal خودکار certbot با systemd timer از همین پلاگین DNS استفاده میکند — چک:
> `sudo certbot renew --dry-run`.

---

## 4. فاز ۳ — سنکرون داده: Plan B (صفر downtime) یا Plan A (ساده)

### Plan B — logical replication (مسیر اصلی: بدون قطعی)

```bash
# ── روی PG قدیمی: wal_level=logical (یک‌بار restart ~۱-۲ دقیقه — در ساعات کم‌ترافیک) ──
az postgres flexible-server parameter set -g fm-prod -n fm-pg --name wal_level --value logical
az postgres flexible-server restart -g fm-prod -n fm-pg --yes

# ── publication روی منبع (old) ──
psql "postgresql://postgres:<PASS>@fm-pg.postgres.database.azure.com:5432/blog?sslmode=require" \
  -c 'CREATE PUBLICATION pub_fm_migrate FOR ALL TABLES;'

# ── subscription روی مقصد (new) ──
# ⚠️ قبلش schema-only restore کرده باش (فاز ۱ گام ۵ — variant B)
psql "postgresql://postgres:<PASS>@fm-pg-uae.postgres.database.azure.com:5432/blog?sslmode=require" \
  -c "CREATE SUBSCRIPTION sub_fm_migrate
      CONNECTION 'host=fm-pg.postgres.database.azure.com port=5432 dbname=blog user=postgres password=<PASS> sslmode=require'
      PUBLICATION pub_fm_migrate
      WITH (copy_data = true);"

# ── مانیتور lag (روی مقصد) — pending باید به 0 برسد و بماند ──
# (کوئری استاندارد داک رسمی PostgreSQL — pg_stat_subscription)
psql "...fm-pg-uae..." -c "SELECT subname, received_lsn, latest_end_lsn, pg_wal_lsn_diff(latest_end_lsn, received_lsn) AS pending_bytes FROM pg_stat_subscription;"
```

> **دو نکتهٔ مهم:**
> 1. **Sequences در PG16 replicate نمی‌شوند** — قبل از cutover، مقدار هر sequence را از
>    منبع به مقصد منتقل کن:
>    ```sql
>    -- روی منبع، برای هر جدول با serial/identity (مثلاً Post):
>    SELECT setval('"Post_id_seq"', (SELECT COALESCE(MAX(id),1) FROM "Post"));
>    -- مقادیر دقیق را از pg_get_serial_sequence بگیر
>    ```
> 2. **copy_data=true** یعنی هیچ gap ای بین dump و stream نیست (snapshot در لحظهٔ
>    ساخت slot گرفته میشود). برای ۹هزار ردیف، سینک اولیه ثانیه‌ای است.

### Plan A — dual-dump (پشتیبان؛ ~۳-۵ دقیقه قطعی در ساعت ۰۲:۰۰)

```bash
# یک بار دیگر همان pg_dump + pg_restore — با `--clean` تا دادهٔ قبلی ری‌استارت شود
pg_dump "...fm-pg..." -Fc --no-owner --no-privileges -f /tmp/blog-final.dump
pg_restore "...fm-pg-uae..." --no-owner --no-privileges --clean --if-exists -d blog /tmp/blog-final.dump
# (مقادیر sequence ها داخل dump هستند — خودکار درست می‌شوند)
```

---

## 5. فاز ۴ — Cutover (بدون downtime — ترتیب دقیق مهم است)

> معیار قبل از شروع: lag = 0، هر دو VM سالم، TLS روی VM جدید سبز، backup-nightly دستی جواب داده.

| گام | دستور / کار | چرا این ترتیب؟ |
|-----|-------------|----------------|
| **G0** | روی VM **قدیمی**: `docker stop deploy-cron-1` | نوشتن‌های بک‌گراند (نرخ بازار…) متوقف — فقط ترافیک کاربر می‌ماند |
| **G1** | روی VM **جدید**: `docker compose stop web` → در `~/fm-blog/.env` مقدار `DATABASE_URL` و `DIRECT_URL` را به `fm-pg-uae.postgres.database.azure.com` تغییر بده → `docker compose up -d` → `curl localhost:3000` = 200 | VM جدید هنوز ترافیک ندارد → قطعی صفر؛ حالا به DB جدید نوشته می‌شود |
| **G2** | Sequences را از منبع به مقصد setval کن (فقط Plan B) | جلوگیری از collision id |
| **G3** | صبر کن `pg_stat_subscription.lag = 0` | نوشته‌های باقی‌ماندهٔ VM قدیمی (ترافیک زنده) اعمال شوند |
| **G4** | **DNS flip** در Cloudflare: رکورد A → `$NEW_VM_IP` (پایین: دستور API) | کاربران از همین لحظه به VM جدید (DB جدید) وصل‌اند — بدون حتی یک‌بار خطا چون هر دو نسخه هم‌ارزند |
| **G5** | روی VM **قدیمی**: `docker stop deploy-web-1 deploy-cron-1` | منبع (old DB) منجمد — فقط in-flight های ثانیه‌ای |
| **G6** | صبر کن lag = 0 دوباره → روی مقصد: `ALTER SUBSCRIPTION sub_fm_migrate DISABLE; DROP SUBSCRIPTION sub_fm_migrate;` و روی منبع `DROP PUBLICATION pub_fm_migrate;` | هیچ نوشته‌ای از دست نمی‌رود |
| **G7** | GitHub → Settings → Secrets → Actions → **`DATABASE_URL`** → هاست جدید | workflow بکاپ شبانه از این secret می‌خواند |
| **G8** | Verify (فاز ۶) → سپس فاز ۵ (پاک‌سازی) | — |

### تغییر رکورد A با Cloudflare API

```bash
CF_TOKEN='...'  # همان توکن DNS-01
ZONE_ID='...'   # Cloudflare → Overview → API → Zone ID
# شناسهٔ رکورد A فعلی:
RECORD_ID=$(curl -sS "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?type=A&name=financialmarket.page" \
  -H "Authorization: Bearer $CF_TOKEN" | jq -r '.result[0].id')

# ✂️ Cutover — content = IP جدید:
curl -sS -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
  -H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json" \
  -d "{\"content\":\"$NEW_VM_IP\",\"proxied\":true}"

# ↩️ Rollback — content = 20.109.177.20 (همین دستور با IP قدیمی)
```

---

## 6. فاز ۵ — Verify (چک‌لیست قبل از پاک‌سازی)

```bash
# ۱) بیرونی — چند بار پشت‌سرهم از محل کاربر:
curl -sS -o /dev/null -w "TTFB %{time_starttransfer}s | code %{http_code}\n" https://financialmarket.page/
# انتظار: TTFB ~0.1–0.3s (قبلاً 1.2–1.3s) — cf-cache-status خالی یا HIT

# ۲) روی VM جدید:
curl -sS -o /dev/null -w 'local %{http_code}\n' http://localhost:3000/
docker compose --env-file .env -f deploy/docker-compose.azure.yml ps   # web healthy + cron Up
curl -sS https://financialmarket.page --resolve financialmarket.page:443:"$NEW_VM_IP" -o /dev/null -w 'TLS direct %{http_code}\n'

# ۳) DB: شمارش ردیف در مقصد vs منبع برای چند جدول بزرگ
psql "...fm-pg-uae..." -c 'SELECT count(*) FROM "Post";'   # برابر با منبع

# ۴) کارکرد: لاگین OAuth (Google/GitHub)، /dashboard ادمین، آپلود تصویر (S3)، تیکر نرخ (cron)
# ۵) بکاپ: GitHub Actions → backup-nightly → Run workflow (بعد از G7)
```

---

## 7. فاز ۶ — پاک‌سازی منابع قدیمی (بعد از ۷ روز موفق)

```bash
# VM قدیمی — همان‌روز بعد از cutover deallocate کن (توقف هزینه؛ نگه داشتن برای رولبک):
az vm deallocate -g fm-prod -n fm-vm

# بعد از ۷ روز:
az vm delete -g fm-prod -n fm-vm --yes --delete-disks
az network public-ip delete -g fm-prod -n fm-vm-ip
az postgres flexible-server delete -g fm-prod -n fm-pg --yes

# مستندات را به‌روز کن: deploy/AZURE.md (جدول معماری، IP ها، دیپلوی) + این رانبوک
```

---

## 8. رولبک (هر لحظه تا ۷ روز)

```bash
# ۱) DNS برگرد: همان PATCH با content=20.109.177.20
# ۲) VM قدیمی (اگر deallocate شده): az vm start -g fm-prod -n fm-vm
# ۳) چون .env و کانتینرهایش دست‌نخورده‌اند → همان لحظه سرویس می‌دهد (DB قدیمی هنوز هست)
# ۴) DB قدیمی هنوز موجود است → بدون نیاز به restore
# (فقط برای Plan B: نوشته‌های دورهٔ sync که فقط در DB جدیدند از دست می‌روند — بازهٔ کوتاه است)
```

---

## 9. نکته‌های تکمیلی

- **کش Cloudflare:** اگر Cache Rule (رانبوک AZURE.md §پرفورمنس) هنوز فعال نشده، بعد از مهاجرت
  TTFB لبه ≈ ۰.۱s میشود؛ با Cache Rule حتی بهتر. ترتیب پیشنهادی: **اول Cache Rule، بعد مهاجرت**
  (نیاز فوری به مهاجرت را هم کم می‌کند).
- **migrate های Prisma آینده:** طبق معمول، یک‌باره و دستی:
  `docker run --rm -v ~/fm-blog/.env:/app/.env ghcr.io/biootak/fm-blog-web:main npx prisma migrate deploy`
  (روی VM جدید).
- **Bandwidth 15GB/ماه** تغییر نمی‌کند (تصاویر روی Filebase هستند).
- **اگر آفر دانشجویی تمام شد:** uaenorth برای Container Apps هم گزینهٔ هم‌ریجن است.
- **لاگ عیب‌یابی cutover:** `sudo tail -f /var/log/fm-blog-azure-deploy.log` (VM جدید) و
  `docker compose ... logs -f web` .
